import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SettingDefinition {
  key: string;
  group: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json' | 'secret' | 'color' | 'url' | 'select';
  defaultValue: string;
  isSecret?: boolean;
  options?: string[]; // for 'select' type
}

// All configurable settings with defaults
export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // General
  { key: 'SITE_NAME', group: 'general', label: 'Site Name', type: 'text', defaultValue: 'TotalStore' },
  { key: 'SITE_TAGLINE', group: 'general', label: 'Tagline', type: 'text', defaultValue: "Uganda's #1 Online Marketplace" },
  { key: 'SITE_LOGO_URL', group: 'general', label: 'Logo URL', type: 'url', defaultValue: '' },
  { key: 'SITE_FAVICON_URL', group: 'general', label: 'Favicon URL', type: 'url', defaultValue: '' },
  { key: 'CURRENCY', group: 'general', label: 'Default Currency', type: 'select', defaultValue: 'UGX', options: ['UGX', 'KES', 'TZS', 'USD'] },
  { key: 'MAINTENANCE_MODE', group: 'general', label: 'Maintenance Mode', type: 'boolean', defaultValue: 'false' },

  // Branding / Appearance
  { key: 'PRIMARY_COLOR', group: 'branding', label: 'Primary Color', type: 'color', defaultValue: '#0ea5e9' },
  { key: 'ACCENT_COLOR', group: 'branding', label: 'Accent Color', type: 'color', defaultValue: '#f59e0b' },
  { key: 'FONT_FAMILY', group: 'branding', label: 'Font Family', type: 'text', defaultValue: 'Inter' },
  { key: 'FOOTER_COPYRIGHT', group: 'branding', label: 'Footer Copyright', type: 'text', defaultValue: '© 2026 TotalStore. All rights reserved.' },

  // Social Media
  { key: 'SOCIAL_FACEBOOK', group: 'social', label: 'Facebook URL', type: 'url', defaultValue: '' },
  { key: 'SOCIAL_INSTAGRAM', group: 'social', label: 'Instagram URL', type: 'url', defaultValue: '' },
  { key: 'SOCIAL_TIKTOK', group: 'social', label: 'TikTok URL', type: 'url', defaultValue: '' },
  { key: 'SOCIAL_WHATSAPP', group: 'social', label: 'WhatsApp Number', type: 'text', defaultValue: '' },
  { key: 'SOCIAL_TWITTER', group: 'social', label: 'Twitter/X URL', type: 'url', defaultValue: '' },

  // Commerce
  { key: 'DEFAULT_COMMISSION_PERCENT', group: 'commerce', label: 'Default Commission (%)', type: 'number', defaultValue: '10' },
  { key: 'DELIVERY_FEE_DEFAULT', group: 'commerce', label: 'Default Delivery Fee (UGX)', type: 'number', defaultValue: '5000' },
  { key: 'FREE_DELIVERY_THRESHOLD', group: 'commerce', label: 'Free Delivery Above (UGX)', type: 'number', defaultValue: '150000' },
  { key: 'MIN_ORDER_AMOUNT', group: 'commerce', label: 'Minimum Order Amount', type: 'number', defaultValue: '5000' },
  { key: 'PRODUCTS_PER_PAGE', group: 'commerce', label: 'Products Per Page', type: 'number', defaultValue: '24' },
  { key: 'ESCROW_HOLD_DAYS', group: 'commerce', label: 'Escrow Hold Days', type: 'number', defaultValue: '3' },
  { key: 'AUTO_CONFIRM_DELIVERY_HOURS', group: 'commerce', label: 'Auto-Confirm Delivery (hours)', type: 'number', defaultValue: '48' },

  // Notifications
  { key: 'SMS_PROVIDER', group: 'notifications', label: 'SMS Provider', type: 'select', defaultValue: 'africas_talking', options: ['africas_talking', 'twilio', 'nexmo'] },
  { key: 'SMS_API_KEY', group: 'notifications', label: 'SMS API Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'SMS_SENDER_ID', group: 'notifications', label: 'SMS Sender ID', type: 'text', defaultValue: 'TotalStore' },
  { key: 'FCM_SERVER_KEY', group: 'notifications', label: 'Firebase FCM Server Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'EMAIL_FROM_ADDRESS', group: 'notifications', label: 'Email From Address', type: 'text', defaultValue: 'noreply@totalstore.ug' },
  { key: 'EMAIL_FROM_NAME', group: 'notifications', label: 'Email From Name', type: 'text', defaultValue: 'TotalStore' },

  // Payment
  { key: 'MTN_MOMO_API_KEY', group: 'payment', label: 'MTN MoMo API Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'MTN_MOMO_API_USER', group: 'payment', label: 'MTN MoMo API User', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'MTN_MOMO_SUBSCRIPTION_KEY', group: 'payment', label: 'MTN Subscription Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'MTN_MOMO_ENVIRONMENT', group: 'payment', label: 'MTN MoMo Environment', type: 'select', defaultValue: 'sandbox', options: ['sandbox', 'production'] },
  { key: 'AIRTEL_API_KEY', group: 'payment', label: 'Airtel API Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'AIRTEL_CLIENT_SECRET', group: 'payment', label: 'Airtel Client Secret', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'PESAPAL_CONSUMER_KEY', group: 'payment', label: 'Pesapal Consumer Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'PESAPAL_CONSUMER_SECRET', group: 'payment', label: 'Pesapal Consumer Secret', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'PESAPAL_ENVIRONMENT', group: 'payment', label: 'Pesapal Environment', type: 'select', defaultValue: 'sandbox', options: ['sandbox', 'live'] },
  { key: 'FLUTTERWAVE_PUBLIC_KEY', group: 'payment', label: 'Flutterwave Public Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'FLUTTERWAVE_SECRET_KEY', group: 'payment', label: 'Flutterwave Secret Key', type: 'secret', defaultValue: '', isSecret: true },

  // Maps & Tracking
  { key: 'GOOGLE_MAPS_API_KEY', group: 'maps', label: 'Google Maps API Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'MAP_PROVIDER', group: 'maps', label: 'Map Provider', type: 'select', defaultValue: 'openstreetmap', options: ['google', 'openstreetmap'] },
  { key: 'DEFAULT_LATITUDE', group: 'maps', label: 'Default Map Latitude', type: 'number', defaultValue: '0.3476' },
  { key: 'DEFAULT_LONGITUDE', group: 'maps', label: 'Default Map Longitude', type: 'number', defaultValue: '32.5825' },

  // Storage
  { key: 'STORAGE_PROVIDER', group: 'storage', label: 'Storage Provider', type: 'select', defaultValue: 'local', options: ['local', 'cloudinary', 's3'] },
  { key: 'CLOUDINARY_CLOUD_NAME', group: 'storage', label: 'Cloudinary Cloud Name', type: 'text', defaultValue: '' },
  { key: 'CLOUDINARY_API_KEY', group: 'storage', label: 'Cloudinary API Key', type: 'secret', defaultValue: '', isSecret: true },
  { key: 'CLOUDINARY_API_SECRET', group: 'storage', label: 'Cloudinary API Secret', type: 'secret', defaultValue: '', isSecret: true },

  // App Branding
  { key: 'BUYER_APP_LOGO_URL', group: 'app_branding', label: 'Buyer App Logo', type: 'url', defaultValue: '' },
  { key: 'RIDER_APP_LOGO_URL', group: 'app_branding', label: 'Rider App Logo', type: 'url', defaultValue: '' },
  { key: 'SELLER_APP_LOGO_URL', group: 'app_branding', label: 'Seller App Logo', type: 'url', defaultValue: '' },
  { key: 'BUYER_APP_SPLASH_COLOR', group: 'app_branding', label: 'Buyer App Splash Color', type: 'color', defaultValue: '#0ea5e9' },

  // Feature Toggles
  { key: 'FEATURE_FLASH_SALES', group: 'features', label: 'Flash Sales', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_LIVE_STREAMS', group: 'features', label: 'Live Streams', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_REELS', group: 'features', label: 'Reels', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_POS', group: 'features', label: 'Point of Sale', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_BLOG', group: 'features', label: 'Blog', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_CHAT', group: 'features', label: 'Live Chat', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_WALLET', group: 'features', label: 'Wallet System', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_COD', group: 'features', label: 'Cash on Delivery', type: 'boolean', defaultValue: 'true' },
  { key: 'FEATURE_RIDER_TRACKING', group: 'features', label: 'Rider GPS Tracking', type: 'boolean', defaultValue: 'true' },

  // SEO
  { key: 'SEO_TITLE', group: 'seo', label: 'Default Page Title', type: 'text', defaultValue: 'TotalStore - Shop Online Uganda' },
  { key: 'SEO_DESCRIPTION', group: 'seo', label: 'Meta Description', type: 'text', defaultValue: "Shop Uganda's largest online marketplace. Electronics, fashion, home & more." },
  { key: 'GOOGLE_ANALYTICS_ID', group: 'seo', label: 'Google Analytics ID', type: 'text', defaultValue: '' },

  // Integration
  { key: 'SENTRY_DSN', group: 'integrations', label: 'Sentry DSN', type: 'secret', defaultValue: '', isSecret: true },

  // Dynamic API Configuration
  { key: 'API_BASE_URL', group: 'api_config', label: 'Primary API Base URL', type: 'url', defaultValue: 'https://shop.saktech.org/api/v1' },
  { key: 'API_BACKUP_URL', group: 'api_config', label: 'Backup API Base URL', type: 'url', defaultValue: '' },
  { key: 'UPLOAD_BASE_URL', group: 'api_config', label: 'Upload / CDN Base URL', type: 'url', defaultValue: 'https://shop.saktech.org' },
  { key: 'APP_VERSION_BUYER', group: 'api_config', label: 'Buyer App Latest Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_VERSION_SELLER', group: 'api_config', label: 'Seller App Latest Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_VERSION_RIDER', group: 'api_config', label: 'Rider App Latest Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_MIN_VERSION_BUYER', group: 'api_config', label: 'Buyer Min Required Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_MIN_VERSION_SELLER', group: 'api_config', label: 'Seller Min Required Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_MIN_VERSION_RIDER', group: 'api_config', label: 'Rider Min Required Version', type: 'text', defaultValue: '1.0.0' },
  { key: 'APP_FORCE_UPDATE', group: 'api_config', label: 'Force Update All Apps', type: 'boolean', defaultValue: 'false' },
  { key: 'APP_BUYER_DOWNLOAD_URL', group: 'api_config', label: 'Buyer APK Download URL', type: 'url', defaultValue: '/uploads/apps/buyer-latest.apk' },
  { key: 'APP_SELLER_DOWNLOAD_URL', group: 'api_config', label: 'Seller APK Download URL', type: 'url', defaultValue: '/uploads/apps/seller-latest.apk' },
  { key: 'APP_RIDER_DOWNLOAD_URL', group: 'api_config', label: 'Rider APK Download URL', type: 'url', defaultValue: '/uploads/apps/rider-latest.apk' },
];

@Injectable()
export class DynamicSettingsService {
  private readonly logger = new Logger(DynamicSettingsService.name);
  private cache: Map<string, string> = new Map();
  private lastRefresh = 0;
  private readonly CACHE_TTL = 60_000; // 1 minute

  constructor(private prisma: PrismaService) {}

  /** Get a single setting value (with caching) */
  async get(key: string): Promise<string> {
    await this.ensureCache();
    if (this.cache.has(key)) return this.cache.get(key)!;
    const def = SETTING_DEFINITIONS.find((d) => d.key === key);
    return def?.defaultValue ?? '';
  }

  /** Get all settings, organized by group */
  async getAllGrouped() {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });

    const groups: Record<string, Array<SettingDefinition & { value: string }>> = {};
    for (const def of SETTING_DEFINITIONS) {
      if (!groups[def.group]) groups[def.group] = [];
      const raw = map[def.key] ?? def.defaultValue;
      groups[def.group].push({
        ...def,
        value: def.isSecret && raw ? raw.replace(/.(?=.{4})/g, '•') : raw,
      });
    }
    return groups;
  }

  /** Get all settings as flat key-value */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    // Fill defaults
    for (const def of SETTING_DEFINITIONS) {
      result[def.key] = def.defaultValue;
    }
    // Override with DB values
    rows.forEach((r) => { result[r.key] = r.value; });
    return result;
  }

  /** Get public-safe settings (no secrets) */
  async getPublicSettings(): Promise<Record<string, string>> {
    const all = await this.getAll();
    const result: Record<string, string> = {};
    for (const def of SETTING_DEFINITIONS) {
      if (!def.isSecret) {
        result[def.key] = all[def.key];
      }
    }
    return result;
  }

  /** Update a single setting with audit trail */
  async set(key: string, value: string, changedBy: string) {
    const def = SETTING_DEFINITIONS.find((d) => d.key === key);
    const existing = await this.prisma.setting.findUnique({ where: { key } });

    await this.prisma.$transaction([
      this.prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value,
          group: def?.group ?? 'general',
          label: def?.label ?? key,
          type: def?.type ?? 'text',
          isSecret: def?.isSecret ?? false,
        },
        update: { value },
      }),
      this.prisma.settingsAuditLog.create({
        data: {
          key,
          oldValue: existing?.value ?? null,
          newValue: def?.isSecret ? '[REDACTED]' : value,
          changedBy,
        },
      }),
    ]);

    this.cache.set(key, value);
    this.logger.log(`Setting ${key} updated by ${changedBy}`);
    return { key, value: def?.isSecret ? '[REDACTED]' : value };
  }

  /** Bulk update settings */
  async bulkSet(settings: { key: string; value: string }[], changedBy: string) {
    const results = [];
    for (const s of settings) {
      results.push(await this.set(s.key, s.value, changedBy));
    }
    return results;
  }

  /** Get audit logs */
  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.settingsAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.settingsAuditLog.count(),
    ]);
    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  /** Get payment gateway configs */
  async getPaymentGateways() {
    return this.prisma.paymentGatewayConfig.findMany({ orderBy: { provider: 'asc' } });
  }

  /** Update/create payment gateway config */
  async upsertPaymentGateway(provider: string, data: {
    isEnabled?: boolean;
    isSandbox?: boolean;
    config?: Record<string, string>;
    commission?: number;
    metadata?: Record<string, any>;
  }, changedBy: string) {
    const result = await this.prisma.paymentGatewayConfig.upsert({
      where: { provider },
      create: {
        provider,
        isEnabled: data.isEnabled ?? false,
        isSandbox: data.isSandbox ?? true,
        config: data.config ?? {},
        commission: data.commission ?? 0,
        metadata: data.metadata ?? {},
      },
      update: {
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.isSandbox !== undefined ? { isSandbox: data.isSandbox } : {}),
        ...(data.config ? { config: data.config } : {}),
        ...(data.commission !== undefined ? { commission: data.commission } : {}),
        ...(data.metadata ? { metadata: data.metadata } : {}),
      },
    });

    // Audit
    await this.prisma.settingsAuditLog.create({
      data: {
        key: `payment_gateway:${provider}`,
        oldValue: null,
        newValue: JSON.stringify({ isEnabled: result.isEnabled, isSandbox: result.isSandbox, commission: result.commission }),
        changedBy,
      },
    });

    return result;
  }

  private async ensureCache() {
    if (Date.now() - this.lastRefresh < this.CACHE_TTL) return;
    const rows = await this.prisma.setting.findMany();
    this.cache.clear();
    rows.forEach((r) => this.cache.set(r.key, r.value));
    this.lastRefresh = Date.now();
  }

  /** Get the dynamic app configuration for mobile/web clients (no secrets) */
  async getAppConfig() {
    const keys = [
      'API_BASE_URL', 'API_BACKUP_URL', 'UPLOAD_BASE_URL',
      'APP_VERSION_BUYER', 'APP_VERSION_SELLER', 'APP_VERSION_RIDER',
      'APP_MIN_VERSION_BUYER', 'APP_MIN_VERSION_SELLER', 'APP_MIN_VERSION_RIDER',
      'APP_FORCE_UPDATE',
      'APP_BUYER_DOWNLOAD_URL', 'APP_SELLER_DOWNLOAD_URL', 'APP_RIDER_DOWNLOAD_URL',
      'MAINTENANCE_MODE', 'SITE_NAME',
    ];

    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }

    return {
      apiBaseUrl: result['API_BASE_URL'],
      apiBackupUrl: result['API_BACKUP_URL'] || null,
      uploadBaseUrl: result['UPLOAD_BASE_URL'],
      siteName: result['SITE_NAME'],
      maintenanceMode: result['MAINTENANCE_MODE'] === 'true',
      apps: {
        buyer: {
          version: result['APP_VERSION_BUYER'],
          minVersion: result['APP_MIN_VERSION_BUYER'],
          downloadUrl: result['APP_BUYER_DOWNLOAD_URL'],
          forceUpdate: result['APP_FORCE_UPDATE'] === 'true',
        },
        seller: {
          version: result['APP_VERSION_SELLER'],
          minVersion: result['APP_MIN_VERSION_SELLER'],
          downloadUrl: result['APP_SELLER_DOWNLOAD_URL'],
          forceUpdate: result['APP_FORCE_UPDATE'] === 'true',
        },
        rider: {
          version: result['APP_VERSION_RIDER'],
          minVersion: result['APP_MIN_VERSION_RIDER'],
          downloadUrl: result['APP_RIDER_DOWNLOAD_URL'],
          forceUpdate: result['APP_FORCE_UPDATE'] === 'true',
        },
      },
    };
  }
}
