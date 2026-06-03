import { Injectable, CanActivate, ExecutionContext, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Role-based access control guard with fail-closed enforcement when
 * ROLES_GUARD_STRICT=true. In strict mode, undecorated handlers (no @Roles,
 * no @Public) return 403 — this is the production-safe default.
 *
 * During the audit phase (strict OFF, the deploy default), undecorated handlers
 * are still allowed but a WARN log is emitted with the route — operators flip
 * the flag once logs are clean.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private static readonly STRICT = process.env.ROLES_GUARD_STRICT === 'true';
  private static readonly warned = new Set<string>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // Untagged endpoint. In strict mode, deny. In permissive mode, warn-once and allow.
      const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
      if (RolesGuard.STRICT) {
        this.logger.warn(`Denied untagged endpoint: ${routeKey}. Add @Roles() or @Public().`);
        return false;
      }
      if (!RolesGuard.warned.has(routeKey)) {
        RolesGuard.warned.add(routeKey);
        this.logger.warn(`Untagged endpoint allowed (strict mode off): ${routeKey}. Add @Roles() or @Public() before enabling ROLES_GUARD_STRICT.`);
      }
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return !!user && requiredRoles.includes(user.role);
  }
}
