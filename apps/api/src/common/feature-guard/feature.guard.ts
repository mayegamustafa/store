import { CanActivate, ExecutionContext, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FEATURE_KEY_META } from './feature.decorator';

/**
 * Reads the Setting key declared by @Feature() and returns 404 when the flag
 * is disabled. Reads are batched per-request (process-level memoization with
 * a 30s TTL) so a flag check costs negligible.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);
  private static readonly cache = new Map<string, { value: string; expires: number }>();
  private static readonly TTL_MS = 30_000;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(FEATURE_KEY_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true;

    const value = await this._get(key);
    // Convention: missing row = default-on. Only the literal string "false" disables.
    if (value === 'false') {
      throw new NotFoundException();
    }
    return true;
  }

  private async _get(key: string): Promise<string> {
    const now = Date.now();
    const cached = FeatureGuard.cache.get(key);
    if (cached && cached.expires > now) return cached.value;
    try {
      const row = await this.prisma.setting.findUnique({
        where: { key },
        select: { value: true },
      });
      const value = row?.value ?? 'true'; // default on
      FeatureGuard.cache.set(key, { value, expires: now + FeatureGuard.TTL_MS });
      return value;
    } catch (e: any) {
      this.logger.warn(`FeatureGuard read failed for ${key}: ${e?.message}; default-on`);
      return 'true';
    }
  }
}
