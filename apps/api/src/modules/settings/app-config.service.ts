import { BadRequestException, Injectable } from '@nestjs/common';
import { DynamicSettingsService } from './dynamic-settings.service';

interface UpdateConfigPayload {
  apiBaseUrl?: string;
  apiBackupUrl?: string | null;
  buyerVersion?: string;
  sellerVersion?: string;
  riderVersion?: string;
}

@Injectable()
export class AppConfigService {
  constructor(private dynamicSettings: DynamicSettingsService) {}

  async getPublicConfig() {
    const [apiBaseUrl, apiBackupUrl, buyerVersion, sellerVersion, riderVersion] = await Promise.all([
      this.dynamicSettings.get('API_BASE_URL'),
      this.dynamicSettings.get('API_BACKUP_URL'),
      this.dynamicSettings.get('APP_VERSION_BUYER'),
      this.dynamicSettings.get('APP_VERSION_SELLER'),
      this.dynamicSettings.get('APP_VERSION_RIDER'),
    ]);

    return {
      apiBaseUrl,
      apiBackupUrl: apiBackupUrl || null,
      buyerVersion,
      sellerVersion,
      riderVersion,
      primary: apiBaseUrl,
      backup: apiBackupUrl || null,
    };
  }

  async updateConfig(payload: UpdateConfigPayload, changedBy: string) {
    if (
      payload.apiBaseUrl === undefined &&
      payload.apiBackupUrl === undefined &&
      payload.buyerVersion === undefined &&
      payload.sellerVersion === undefined &&
      payload.riderVersion === undefined
    ) {
      throw new BadRequestException('No configuration fields provided');
    }

    if (payload.apiBaseUrl !== undefined) this.assertValidHttpUrl(payload.apiBaseUrl, 'apiBaseUrl');
    if (payload.apiBackupUrl) this.assertValidHttpUrl(payload.apiBackupUrl, 'apiBackupUrl');
    if (payload.buyerVersion !== undefined) this.assertSemver(payload.buyerVersion, 'buyerVersion');
    if (payload.sellerVersion !== undefined) this.assertSemver(payload.sellerVersion, 'sellerVersion');
    if (payload.riderVersion !== undefined) this.assertSemver(payload.riderVersion, 'riderVersion');

    const pairs: Array<{ key: string; value: string }> = [];
    if (payload.apiBaseUrl !== undefined) pairs.push({ key: 'API_BASE_URL', value: payload.apiBaseUrl });
    if (payload.apiBackupUrl !== undefined) pairs.push({ key: 'API_BACKUP_URL', value: payload.apiBackupUrl || '' });
    if (payload.buyerVersion !== undefined) pairs.push({ key: 'APP_VERSION_BUYER', value: payload.buyerVersion });
    if (payload.sellerVersion !== undefined) pairs.push({ key: 'APP_VERSION_SELLER', value: payload.sellerVersion });
    if (payload.riderVersion !== undefined) pairs.push({ key: 'APP_VERSION_RIDER', value: payload.riderVersion });

    for (const { key, value } of pairs) {
      await this.dynamicSettings.set(key, value, changedBy);
    }

    return this.getPublicConfig();
  }

  private assertValidHttpUrl(value: string, field: string) {
    let u: URL;
    try { u = new URL(value); } catch {
      throw new BadRequestException(`${field} must be a valid URL`);
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new BadRequestException(`${field} must use http or https`);
    }
  }

  private assertSemver(value: string, field: string) {
    if (!/^\d+\.\d+\.\d+$/.test(value)) {
      throw new BadRequestException(`${field} must be in semver format (e.g. 1.2.3)`);
    }
  }
}
