import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as intentionally public (no auth, no role check).
 * Required when ROLES_GUARD_STRICT=true; otherwise undecorated endpoints log a warning.
 *
 * Use for: login, register, OTP, webhooks/IPN, healthcheck, public catalog reads, OAuth callbacks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
