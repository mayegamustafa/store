import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto, ResetStaffPasswordDto } from './dto/create-staff.dto';
import { Role, StaffRole } from '@prisma/client';

// Default permissions per role — what they can do in the system
export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'orders:read', 'orders:write', 'orders:cancel',
    'users:read', 'users:write', 'users:suspend',
    'sellers:read', 'sellers:approve', 'sellers:reject',
    'riders:read', 'riders:approve',
    'products:read', 'products:approve', 'products:reject',
    'reports:read',
    'banners:read', 'banners:write',
    'settings:read', 'settings:write',
    'notifications:send',
    'staff:read', 'staff:write',
  ],
  ORDER_MANAGER: [
    'orders:read', 'orders:write', 'orders:cancel',
    'riders:read',
    'delivery:read', 'delivery:write',
  ],
  FINANCE_MANAGER: [
    'orders:read',
    'payments:read',
    'payouts:read', 'payouts:write',
    'reports:read',
  ],
  SUPPORT_AGENT: [
    'orders:read',
    'users:read',
    'sellers:read',
    'products:read',
    'notifications:send',
  ],
  CONTENT_MANAGER: [
    'products:read', 'products:approve', 'products:reject',
    'banners:read', 'banners:write',
    'categories:read', 'categories:write',
  ],
  DELIVERY_MANAGER: [
    'orders:read',
    'riders:read', 'riders:write', 'riders:approve',
    'delivery:read', 'delivery:write',
    'tracking:read',
  ],
  REPORTS_VIEWER: ['reports:read', 'orders:read'],
};

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // ── Create staff member ───────────────────────────────────────────────────────
  async create(dto: CreateStaffDto, createdById: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    });
    if (existing) throw new ConflictException('A user with this email or phone already exists');

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        role: Role.STAFF,
        status: 'ACTIVE',
        isEmailVerified: !!dto.email,
        isPhoneVerified: !!dto.phone,
        staffMember: {
          create: {
            staffRole: dto.staffRole,
            permissions: dto.permissions ?? ROLE_DEFAULT_PERMISSIONS[dto.staffRole] ?? [],
            department: dto.department,
            jobTitle: dto.jobTitle,
            notes: dto.notes,
            createdById,
          },
        },
      },
      include: {
        staffMember: true,
      },
    });

    return this._format(user);
  }

  // ── List all staff ────────────────────────────────────────────────────────────
  async findAll(page = 1, limit = 20, search?: string, role?: StaffRole) {
    const skip = (page - 1) * limit;
    const where: any = {
      role: Role.STAFF,
      deletedAt: null,
      ...(role ? { staffMember: { staffRole: role } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { staffMember: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users.map(this._format),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── Get one ───────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      include: { staffMember: true },
    });
    if (!user) throw new NotFoundException('Staff member not found');
    return this._format(user);
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateStaffDto) {
    const user = await this._getOrFail(id);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.firstName ? { firstName: dto.firstName } : {}),
        ...(dto.lastName ? { lastName: dto.lastName } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
        staffMember: {
          update: {
            ...(dto.staffRole ? { staffRole: dto.staffRole } : {}),
            ...(dto.permissions ? { permissions: dto.permissions } : {}),
            ...(dto.department !== undefined ? { department: dto.department } : {}),
            ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        },
      },
      include: { staffMember: true },
    });

    return this._format(updated);
  }

  // ── Reset password ────────────────────────────────────────────────────────────
  async resetPassword(id: string, dto: ResetStaffPasswordDto, requesterId: string) {
    const user = await this._getOrFail(id);
    // Requester must be SUPER_ADMIN or the user themselves
    if (user.id !== requesterId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { staffMember: true },
      });
      if (requester?.staffMember?.staffRole !== StaffRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only SUPER_ADMIN can reset another member\'s password');
      }
    }
    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { message: 'Password updated successfully' };
  }

  // ── Suspend / Reactivate ──────────────────────────────────────────────────────
  async suspend(id: string) {
    const user = await this._getOrFail(id);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } }),
      this.prisma.staffMember.update({ where: { userId: user.id }, data: { isActive: false } }),
    ]);
    return { message: 'Staff member suspended' };
  }

  async reactivate(id: string) {
    const user = await this._getOrFail(id);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } }),
      this.prisma.staffMember.update({ where: { userId: user.id }, data: { isActive: true } }),
    ]);
    return { message: 'Staff member reactivated' };
  }

  // ── Delete (soft) ─────────────────────────────────────────────────────────────
  async remove(id: string) {
    const user = await this._getOrFail(id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    return { message: 'Staff member removed' };
  }

  // ── Roles manifest (for UI) ───────────────────────────────────────────────────
  getRolesManifest() {
    return Object.entries(ROLE_DEFAULT_PERMISSIONS).map(([role, perms]) => ({
      role,
      defaultPermissions: perms,
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private async _getOrFail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
    });
    if (!user) throw new NotFoundException('Staff member not found');
    return user;
  }

  private _format(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
