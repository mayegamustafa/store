import { Body, Controller, Get, Patch, Request, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';
import axios from 'axios';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DynamicSettingsService } from './dynamic-settings.service';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(
    private dynamicSettings: DynamicSettingsService,
    private appConfig: AppConfigService,
  ) {}

  /**
   * Public endpoint — no auth required.
   * Returns dynamic app configuration: API URLs, app versions, maintenance mode.
   * Mobile apps and web clients call this on startup and periodically.
   */
  @Get('public')
  @Version(['1', VERSION_NEUTRAL])
  @ApiOperation({ summary: 'Get dynamic app config (API URLs, versions, maintenance)' })
  async getPublicConfig() {
    const [dynamicConfig, managedConfig] = await Promise.all([
      this.dynamicSettings.getAppConfig(),
      this.appConfig.getPublicConfig(),
    ]);

    return {
      ...dynamicConfig,
      apiBaseUrl: managedConfig.apiBaseUrl,
      apiBackupUrl: managedConfig.apiBackupUrl,
      buyerVersion: managedConfig.buyerVersion,
      sellerVersion: managedConfig.sellerVersion,
      riderVersion: managedConfig.riderVersion,
      primary: managedConfig.primary,
      backup: managedConfig.backup,
    };
  }

  /**
   * Public maps config — returns Google Maps API key.
   * Key must be restricted to allowed Android packages / web domains in Google Cloud Console.
   */
  @Get('maps')
  @Version(['1', VERSION_NEUTRAL])
  @ApiOperation({ summary: 'Get maps configuration including Google Maps API key' })
  async getMapsConfig() {
    const [googleMapsApiKey, defaultLat, defaultLng, mapProvider] = await Promise.all([
      this.dynamicSettings.get('GOOGLE_MAPS_API_KEY'),
      this.dynamicSettings.get('DEFAULT_LATITUDE'),
      this.dynamicSettings.get('DEFAULT_LONGITUDE'),
      this.dynamicSettings.get('MAP_PROVIDER'),
    ]);
    return {
      googleMapsApiKey,
      defaultCenter: {
        lat: parseFloat(defaultLat) || 0.3476,
        lng: parseFloat(defaultLng) || 32.5825,
      },
      mapProvider: mapProvider || 'google',
    };
  }

  // ── Live FX rates ─────────────────────────────────────────────────────────
  // Cached 12h in-process. Source: open.er-api.com (free, no key). Base is
  // the platform currency so client currency pickers convert real prices
  // instead of using hardcoded constants.
  private static fxCache: { base: string; rates: Record<string, number>; fetchedAt: number } | null = null;

  @Get('fx')
  @Version(['1', VERSION_NEUTRAL])
  @ApiOperation({ summary: 'Live currency conversion rates (12h cache)' })
  async getFxRates() {
    const base = (await this.dynamicSettings.get('CURRENCY')) || 'UGX';
    const cached = ConfigController.fxCache;
    if (cached && cached.base === base && Date.now() - cached.fetchedAt < 12 * 60 * 60 * 1000) {
      return { base, rates: cached.rates, cached: true };
    }
    try {
      const res = await axios.get(`https://open.er-api.com/v6/latest/${base}`, { timeout: 10_000 });
      const rates = res.data?.rates ?? {};
      ConfigController.fxCache = { base, rates, fetchedAt: Date.now() };
      return { base, rates, cached: false };
    } catch {
      if (cached) return { base: cached.base, rates: cached.rates, cached: true, stale: true };
      return { base, rates: {}, cached: false, error: 'rates unavailable' };
    }
  }

  @Patch('update')
  @Version(['1', VERSION_NEUTRAL])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update public app config (admin/super-admin only)' })
  async updatePublicConfig(
    @Body() body: {
      apiBaseUrl?: string;
      apiBackupUrl?: string | null;
      buyerVersion?: string;
      sellerVersion?: string;
      riderVersion?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.appConfig.updateConfig(body, String(userId));
  }
}
