import { Injectable, Logger } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Trust & verification for riders and sellers.
 *
 * A profile earns the gold "verified" badge automatically once every
 * requirement is present — personal details, role-specific details
 * (vehicle / store), a profile photo, an ID document, and a passed face
 * check. Admins can still ask for missing pieces via requestInfo().
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** What's still missing for a rider to be auto-verified. */
  async riderChecklist(riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id: riderId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, avatar: true } },
      },
    });
    if (!rider) return null;

    const missing: string[] = [];
    if (!rider.user?.firstName || !rider.user?.lastName) missing.push('Full name');
    if (!rider.user?.phone) missing.push('Phone number');
    if (!rider.user?.avatar) missing.push('Profile photo');
    if (!rider.vehicleType) missing.push('Vehicle type');
    if (!rider.vehiclePlate) missing.push('Vehicle number plate');
    if (!rider.licenseNo) missing.push('Driving licence number');
    if (!rider.nationalId && !rider.idDoc) missing.push('National ID');
    if (!rider.faceVerified) missing.push('Face verification');

    return { missing, complete: missing.length === 0, profile: rider };
  }

  /** What's still missing for a seller to be auto-verified. */
  async sellerChecklist(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, avatar: true } },
      },
    });
    if (!seller) return null;

    const missing: string[] = [];
    if (!seller.user?.firstName || !seller.user?.lastName) missing.push('Full name');
    if (!seller.user?.phone) missing.push('Phone number');
    if (!seller.user?.avatar) missing.push('Profile photo');
    if (!seller.storeName) missing.push('Store name');
    if (!seller.storeLogo) missing.push('Store logo');
    if (!seller.nationalId && !seller.idDocFront) missing.push('National ID');
    if (!seller.momoNumber && !seller.bankAccountNo) missing.push('Payout details');
    if (!seller.faceVerified) missing.push('Face verification');

    return { missing, complete: missing.length === 0, profile: seller };
  }

  /**
   * Re-evaluate a rider and grant the badge when everything is in place.
   * Safe to call after any profile update.
   */
  async evaluateRider(riderId: string) {
    const check = await this.riderChecklist(riderId);
    if (!check) return null;
    if (check.complete === check.profile.isVerified) return check;

    await this.prisma.riderProfile.update({
      where: { id: riderId },
      data: {
        isVerified: check.complete,
        verifiedAt: check.complete ? new Date() : null,
        kycStatus: check.complete ? KycStatus.APPROVED : KycStatus.PENDING,
        ...(check.complete
          ? { status: 'ACTIVE' as any, infoRequested: null, infoRequestedAt: null }
          : {}),
      },
    });
    if (check.complete) {
      this.logger.log(`Rider ${riderId} auto-verified — all checks complete`);
      this.notify(
        check.profile.userId,
        'You are verified!',
        'Your rider account passed all checks. Your trusted badge is now active.',
      );
    }
    return check;
  }

  async evaluateSeller(sellerId: string) {
    const check = await this.sellerChecklist(sellerId);
    if (!check) return null;
    if (check.complete === check.profile.isVerified) return check;

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        isVerified: check.complete,
        verifiedAt: check.complete ? new Date() : null,
        kycStatus: check.complete ? KycStatus.APPROVED : KycStatus.PENDING,
        ...(check.complete
          ? { status: 'APPROVED' as any, infoRequested: null, infoRequestedAt: null }
          : {}),
      },
    });
    if (check.complete) {
      this.logger.log(`Seller ${sellerId} auto-verified — all checks complete`);
      this.notify(
        check.profile.userId,
        'Your store is verified!',
        'Your store passed all checks. Your trusted badge is now active.',
      );
    }
    return check;
  }

  /** Admin asks a rider/seller for missing information. */
  async requestInfo(kind: 'rider' | 'seller', id: string, message: string) {
    const data = {
      infoRequested: message,
      infoRequestedAt: new Date(),
      kycStatus: KycStatus.PENDING,
    };
    const profile =
      kind === 'rider'
        ? await this.prisma.riderProfile.update({ where: { id }, data, select: { userId: true } })
        : await this.prisma.sellerProfile.update({ where: { id }, data, select: { userId: true } });

    this.notify(profile.userId, 'Information needed', message);
    return { success: true };
  }

  /** Admin records the result of a face check (selfie vs ID photo). */
  async setFaceVerified(kind: 'rider' | 'seller', id: string, passed: boolean) {
    const data = { faceVerified: passed, faceVerifiedAt: passed ? new Date() : null };
    if (kind === 'rider') {
      await this.prisma.riderProfile.update({ where: { id }, data });
      return this.evaluateRider(id);
    }
    await this.prisma.sellerProfile.update({ where: { id }, data });
    return this.evaluateSeller(id);
  }

  private notify(userId: string, title: string, body: string) {
    void this.notifications
      .sendToUser(userId, 'CUSTOM' as any, { title, body }, {
        channels: ['PUSH', 'IN_APP'] as any,
        fallbackSms: body,
      })
      .catch(() => null);
  }
}
