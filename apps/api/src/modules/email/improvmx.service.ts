import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DynamicSettingsService } from '../settings/dynamic-settings.service';

/**
 * ImprovMX email-forwarding provider (https://api.improvmx.com/v3).
 * Auth: HTTP Basic, username "api", password = API key.
 *
 * Credentials come from the admin-managed dynamic settings
 * (IMPROVMX_API_KEY / IMPROVMX_DOMAIN) with env-var fallback — never
 * hardcoded. Designed so other providers can be slotted in behind the
 * same email controller later.
 */
@Injectable()
export class ImprovmxService {
  private readonly logger = new Logger(ImprovmxService.name);

  constructor(
    private config: ConfigService,
    private settings: DynamicSettingsService,
  ) {}

  private async client(): Promise<{ http: AxiosInstance; domain: string }> {
    const apiKey =
      (await this.settings.get('IMPROVMX_API_KEY')) ||
      this.config.get<string>('IMPROVMX_API_KEY') ||
      '';
    const domain =
      (await this.settings.get('IMPROVMX_DOMAIN')) ||
      this.config.get<string>('IMPROVMX_DOMAIN') ||
      'totalstoreug.com';
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'ImprovMX is not configured — set the API key in Settings → Integrations',
      );
    }
    const http = axios.create({
      baseURL: 'https://api.improvmx.com/v3',
      auth: { username: 'api', password: apiKey },
      timeout: 15_000,
    });
    return { http, domain };
  }

  private fail(action: string, e: any): never {
    const detail =
      e?.response?.data?.error ||
      (e?.response?.data?.errors ? JSON.stringify(e.response.data.errors) : null) ||
      e?.message ||
      'unknown error';
    this.logger.error(`ImprovMX ${action} failed: ${detail}`);
    if (e?.response?.status && e.response.status < 500) {
      throw new BadRequestException(`ImprovMX: ${detail}`);
    }
    throw new ServiceUnavailableException(`ImprovMX unreachable (${action})`);
  }

  async getStatus() {
    const { http, domain } = await this.client();
    try {
      const [account, domainInfo] = await Promise.all([
        http.get('/account'),
        http.get(`/domains/${domain}`),
      ]);
      const d = domainInfo.data?.domain ?? {};
      return {
        connected: true,
        domain,
        active: d.active ?? false,
        dnsValid: d.active ?? false,
        webhook: d.webhook ?? null,
        aliasCount: (d.aliases ?? []).length,
        plan: account.data?.account?.plan?.name ?? null,
        email: account.data?.account?.email ?? null,
      };
    } catch (e) {
      this.fail('status', e);
    }
  }

  /** DNS/MX/SPF verification as reported by ImprovMX. */
  async checkDns() {
    const { http, domain } = await this.client();
    try {
      const res = await http.get(`/domains/${domain}/check`);
      const r = res.data?.records ?? {};
      return {
        domain,
        valid: res.data?.valid ?? false,
        mx: r.mx ?? null,
        spf: r.spf ?? null,
        dkim: r.dkim ?? null,
      };
    } catch (e) {
      this.fail('dns check', e);
    }
  }

  async listAliases() {
    const { http, domain } = await this.client();
    try {
      const res = await http.get(`/domains/${domain}/aliases`);
      return (res.data?.aliases ?? []).map((a: any) => ({
        alias: a.alias,
        email: `${a.alias}@${domain}`,
        forward: a.forward,
        id: a.id,
      }));
    } catch (e) {
      this.fail('list aliases', e);
    }
  }

  async createAlias(alias: string, forward: string) {
    if (!/^[a-z0-9._-]+$/i.test(alias || '')) {
      throw new BadRequestException('Alias may only contain letters, numbers, dots, dashes');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forward || '')) {
      throw new BadRequestException('Forward destination must be a valid email address');
    }
    const { http, domain } = await this.client();
    try {
      const res = await http.post(`/domains/${domain}/aliases`, { alias, forward });
      this.logger.log(`Alias created: ${alias}@${domain} → ${forward}`);
      return res.data?.alias ?? { alias, forward };
    } catch (e) {
      this.fail('create alias', e);
    }
  }

  async updateAlias(alias: string, forward: string) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forward || '')) {
      throw new BadRequestException('Forward destination must be a valid email address');
    }
    const { http, domain } = await this.client();
    try {
      const res = await http.put(`/domains/${domain}/aliases/${encodeURIComponent(alias)}`, { forward });
      this.logger.log(`Alias updated: ${alias}@${domain} → ${forward}`);
      return res.data?.alias ?? { alias, forward };
    } catch (e) {
      this.fail('update alias', e);
    }
  }

  async deleteAlias(alias: string) {
    const { http, domain } = await this.client();
    try {
      await http.delete(`/domains/${domain}/aliases/${encodeURIComponent(alias)}`);
      this.logger.log(`Alias deleted: ${alias}@${domain}`);
      return { success: true };
    } catch (e) {
      this.fail('delete alias', e);
    }
  }

  async getLogs() {
    const { http, domain } = await this.client();
    try {
      const res = await http.get(`/domains/${domain}/logs`);
      return (res.data?.logs ?? []).map((l: any) => ({
        id: l.id,
        created: l.created,
        sender: l.sender?.email ?? null,
        recipient: l.recipient?.email ?? null,
        forwardedTo: (l.forward && (l.forward.email ?? l.forward)) || null,
        subject: l.subject ?? null,
        status: (l.events?.length ? l.events[l.events.length - 1]?.status : null) ?? 'UNKNOWN',
        reason: (l.events?.length ? l.events[l.events.length - 1]?.message : null) ?? null,
      }));
    } catch (e) {
      this.fail('logs', e);
    }
  }
}
