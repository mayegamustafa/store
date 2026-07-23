import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { DeliveryStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private tracking: TrackingGateway,
  ) {}

  private orderStatusForDelivery(status: DeliveryStatus): OrderStatus {
    switch (status) {
      case DeliveryStatus.ASSIGNED:
        return OrderStatus.SHIPPED;
      case DeliveryStatus.PICKED_UP:
      case DeliveryStatus.IN_TRANSIT:
        return OrderStatus.OUT_FOR_DELIVERY;
      case DeliveryStatus.DELIVERED:
        return OrderStatus.DELIVERED;
      case DeliveryStatus.FAILED:
        return OrderStatus.CANCELLED;
    }
  }

  private static haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /**
   * Online riders sorted by distance from the pickup point for an order.
   * Pickup = the seller's shop location; falls back to the delivery address
   * so it still ranks sensibly when a shop hasn't set coordinates.
   * `requesterUserId` (a seller) may only query their own orders.
   */
  async getNearbyRiders(orderId: string, requesterUserId?: string, requesterRole?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: { select: { latitude: true, longitude: true } },
        items: { select: { sellerId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Sellers can only look at orders that include their items
    if (requesterRole === 'SELLER') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { userId: requesterUserId },
        select: { id: true, storeLat: true, storeLng: true },
      });
      if (!seller || !order.items.some((i) => i.sellerId === seller.id)) {
        throw new ForbiddenException('This order does not belong to your store');
      }
    }

    // Pickup reference: first seller's shop with coordinates, else dropoff
    let refLat: number | null = null;
    let refLng: number | null = null;
    const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
    const sellers = await this.prisma.sellerProfile.findMany({
      where: { id: { in: sellerIds } },
      select: { storeLat: true, storeLng: true },
    });
    const withCoords = sellers.find((s) => s.storeLat != null && s.storeLng != null);
    if (withCoords) {
      refLat = withCoords.storeLat!;
      refLng = withCoords.storeLng!;
    } else if (order.address?.latitude != null && order.address?.longitude != null) {
      refLat = order.address.latitude;
      refLng = order.address.longitude;
    }

    const riders = await this.prisma.riderProfile.findMany({
      where: { isOnline: true, status: 'ACTIVE' },
      select: {
        id: true,
        vehicleType: true,
        rating: true,
        currentLat: true,
        currentLng: true,
        lastLocationAt: true,
        isVerified: true,
        user: { select: { firstName: true, lastName: true, phone: true, avatar: true } },
        _count: { select: { deliveries: true } },
        deliveries: {
          where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
          select: { id: true },
        },
      },
    });

    const mapped = riders.map((r) => {
      const hasLoc = r.currentLat != null && r.currentLng != null;
      const distanceKm =
        hasLoc && refLat != null && refLng != null
          ? DeliveryService.haversineKm(refLat, refLng, r.currentLat!, r.currentLng!)
          : null;
      return {
        id: r.id,
        name: `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || 'Rider',
        phone: r.user?.phone,
        avatar: r.user?.avatar,
        vehicleType: r.vehicleType,
        rating: r.rating,
        isVerified: r.isVerified,
        activeJobs: r.deliveries.length,
        location: hasLoc ? { lat: r.currentLat, lng: r.currentLng, updatedAt: r.lastLocationAt } : null,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      };
    });

    // Nearest first; riders without a location go last; fewer active jobs breaks ties
    mapped.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return a.activeJobs - b.activeJobs;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.activeJobs - b.activeJobs;
    });

    return { pickup: refLat != null ? { lat: refLat, lng: refLng } : null, riders: mapped };
  }

  async assignRider(orderId: string, riderId: string, sellerUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { sellerId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Seller path: enforce the order contains their items
    if (sellerUserId) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { userId: sellerUserId },
        select: { id: true },
      });
      if (!seller || !order.items.some((i) => i.sellerId === seller.id)) {
        throw new ForbiddenException('This order does not belong to your store');
      }
    }

    const delivery = await this.prisma.delivery.upsert({
      where: { orderId },
      create: { orderId, riderId, status: 'ASSIGNED' },
      update: { riderId, status: 'ASSIGNED' },
    });

    // Notify the assigned rider — full-screen ALARM push + in-app + realtime socket
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id: riderId },
      select: { userId: true },
    });
    if (rider?.userId) {
      const title = 'New delivery assigned 🚨';
      const body = `You've been assigned order ${order.orderNumber}. Open the app to accept.`;
      const route = '/deliveries/' + delivery.id;

      // In-app record + SMS fallback (the alarm itself is the data push below).
      void this.notifications
        .sendToUser(rider.userId, 'RIDER_ASSIGNED' as any,
          { order_number: order.orderNumber, order_id: order.id, title, body },
          { channels: ['IN_APP'] as any, route,
            fallbackSms: `TotalStore: new delivery ${order.orderNumber} assigned to you.` })
        .catch(() => null);

      // Data-only push → the rider app renders a full-screen, looping alarm
      // even when backgrounded / terminated.
      const riderUser = await this.prisma.user
        .findUnique({ where: { id: rider.userId }, select: { fcmToken: true } })
        .catch(() => null);
      if (riderUser?.fcmToken) {
        void this.notifications
          .sendRiderAssignmentPush(riderUser.fcmToken, {
            title, body, route, orderId: order.id, orderNumber: order.orderNumber,
          })
          .catch(() => null);
      }

      // Realtime event so a foreground app alarms instantly (no push latency).
      try {
        this.tracking.notifyRiderNewDelivery(riderId, {
          deliveryId: delivery.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          title,
          body,
          route,
        });
      } catch { /* gateway not ready — push covers it */ }
    }

    // Update order status to SHIPPED
    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } });

    // Notify buyer
    const buyer = await this.prisma.user.findUnique({
      where: { id: order.buyerId },
      select: { phone: true, fcmToken: true },
    });

    if (buyer?.phone) await this.notifications.notifyOrderShipped(buyer.phone, order.id, order.orderNumber);
    if (buyer?.fcmToken) {
      await this.notifications.sendPushNotification(
        buyer.fcmToken,
        'Your order is on the way! 🚚',
        'Track your delivery live in the app.',
        { orderId },
      );
    }

    return delivery;
  }

  async updateStatus(dto: any, updatedByUserId?: string) {
    const status = dto.status as DeliveryStatus;
    if (!status) throw new BadRequestException('status is required');

    const delivery = dto.deliveryId
      ? await this.prisma.delivery.findUnique({ where: { id: dto.deliveryId }, include: { order: true } })
      : dto.orderId
        ? await this.prisma.delivery.findUnique({ where: { orderId: dto.orderId }, include: { order: true } })
        : null;

    if (!delivery) throw new NotFoundException('Delivery not found');

    const latitude = dto.latitude ?? dto.lat;
    const longitude = dto.longitude ?? dto.lng;

    return this.prisma.$transaction(async (tx) => {
      const nextDelivery = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status,
          actualPickupAt: status === DeliveryStatus.PICKED_UP && !delivery.actualPickupAt ? new Date() : delivery.actualPickupAt,
          deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : delivery.deliveredAt,
          failedAt: status === DeliveryStatus.FAILED ? new Date() : delivery.failedAt,
          failReason: status === DeliveryStatus.FAILED ? dto.note ?? dto.failReason ?? delivery.failReason : delivery.failReason,
          proofPhoto: dto.proof ?? delivery.proofPhoto,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: this.orderStatusForDelivery(status) },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: this.orderStatusForDelivery(status),
          note: dto.note ?? `Delivery status updated to ${status}`,
          updatedBy: updatedByUserId,
        },
      });

      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status,
          note: dto.note,
          proofPhoto: dto.proof,
          latitude: latitude != null ? Number(latitude) : undefined,
          longitude: longitude != null ? Number(longitude) : undefined,
          updatedById: updatedByUserId,
        },
      });

      return nextDelivery;
    });
  }

  getDelivery(orderId: string) {
    return this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        rider: { include: { user: { select: { firstName: true, phone: true } } } },
        order: {
          include: {
            buyer: { select: { firstName: true, lastName: true, phone: true } },
            address: true,
            items: { include: { product: { select: { name: true, images: true, thumbnailUrl: true } } } },
          },
        },
      },
    });
  }

  async canAccessTracking(orderId: string, userId: string, role: string): Promise<boolean> {
    if (!userId) return false;
    if (['ADMIN', 'SUPER_ADMIN'].includes(role)) return true;
    if (role === 'BUYER') {
      const order = await this.prisma.order.findFirst({ where: { id: orderId, buyerId: userId }, select: { id: true } });
      return !!order;
    }
    if (role === 'SELLER') {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, items: { some: { product: { seller: { userId } } } } },
        select: { id: true },
      });
      return !!order;
    }
    if (role === 'RIDER') {
      const delivery = await this.prisma.delivery.findFirst({
        where: { orderId, rider: { userId } },
        select: { id: true },
      });
      return !!delivery;
    }
    return false;
  }

  async getTracking(orderId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        rider: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
            locationLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            address: true,
            buyer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    const address = delivery.order?.address as any;
    const destLat = address?.latitude ?? address?.lat ?? null;
    const destLng = address?.longitude ?? address?.lng ?? null;

    return {
      order: delivery.order,
      delivery: {
        id: delivery.id,
        status: delivery.status,
        estimatedTime: delivery.estimatedTime,
        actualPickupAt: delivery.actualPickupAt,
        deliveredAt: delivery.deliveredAt,
        rider: delivery.rider ? {
          id: delivery.rider.id,
          name: `${delivery.rider.user?.firstName ?? ''} ${delivery.rider.user?.lastName ?? ''}`.trim(),
          phone: delivery.rider.user?.phone,
          vehicleType: delivery.rider.vehicleType,
          rating: delivery.rider.rating,
        } : null,
        currentLocation: delivery.rider?.currentLat ? {
          lat: delivery.rider.currentLat,
          lng: delivery.rider.currentLng,
          updatedAt: delivery.rider.lastLocationAt,
        } : null,
        destination: destLat ? { lat: parseFloat(destLat), lng: parseFloat(destLng) } : null,
        locationLogs: delivery.rider?.locationLogs ?? [],
        statusLogs: delivery.statusLogs,
      },
    };
  }

  getAllPendingDeliveries() {
    return this.prisma.delivery.findMany({
      where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
      include: {
        order: { select: { orderNumber: true, address: true } },
        rider: { select: { id: true, user: { select: { firstName: true, phone: true } } } },
      },
    });
  }

  /**
   * Rider submits proof-of-delivery and atomically marks delivery DELIVERED.
   * - Verifies the rider owns this delivery (via riderProfile.userId).
   * - If the delivery has an `otp`, the rider must supply a matching code.
   * - Captures photo URL (already uploaded to Cloudinary via /upload), optional
   *   signature URL, and geo-location at moment of submission for anti-fraud.
   * - Refuses to re-process a delivery already marked DELIVERED.
   */
  async submitProof(
    deliveryId: string,
    userId: string,
    dto: {
      otp?: string;
      proofPhotoUrl?: string;
      signatureUrl?: string;
      lat?: number;
      lng?: number;
      accuracy?: number;
      note?: string;
    },
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { rider: { select: { userId: true } }, order: { select: { id: true, buyerId: true, orderNumber: true } } },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    if (!delivery.rider || delivery.rider.userId !== userId) {
      throw new BadRequestException('You are not the assigned rider for this delivery');
    }
    if (delivery.status === DeliveryStatus.DELIVERED) {
      throw new BadRequestException('Delivery already marked as delivered');
    }

    // OTP gate (only enforced when delivery.otp is set — keeps backward compat with
    // existing deliveries that never had OTP issued).
    if (delivery.otp) {
      if (!dto.otp) throw new BadRequestException('OTP is required for this delivery');
      if (dto.otp.trim() !== delivery.otp) throw new BadRequestException('Incorrect OTP');
    }

    const proofGeo =
      dto.lat != null && dto.lng != null
        ? { lat: Number(dto.lat), lng: Number(dto.lng), accuracy: dto.accuracy != null ? Number(dto.accuracy) : null }
        : null;

    return this.prisma.$transaction(async (tx) => {
      const nextDelivery = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          proofPhoto: dto.proofPhotoUrl ?? delivery.proofPhoto,
          signature: dto.signatureUrl ?? delivery.signature,
          proofGeo: proofGeo ?? (delivery as any).proofGeo,
          proofAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DELIVERED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: OrderStatus.DELIVERED,
          note: dto.note ?? 'Delivery confirmed with proof',
          updatedBy: userId,
        },
      });

      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: delivery.id,
          status: DeliveryStatus.DELIVERED,
          note: dto.note ?? 'Proof submitted',
          proofPhoto: dto.proofPhotoUrl,
          latitude: proofGeo?.lat,
          longitude: proofGeo?.lng,
          updatedById: userId,
        },
      });

      return nextDelivery;
    }).then(async (result) => {
      // Fire-and-forget buyer notification (don't fail the proof on notification failure).
      if (delivery.order?.buyerId) {
        const buyer = await this.prisma.user.findUnique({
          where: { id: delivery.order.buyerId },
          select: { fcmToken: true, phone: true },
        });
        if (buyer?.fcmToken) {
          this.notifications.sendPushNotification(
            buyer.fcmToken,
            'Order delivered 📦',
            `Your order ${delivery.order.orderNumber} has been delivered.`,
            { orderId: delivery.orderId },
          ).catch(() => null);
        }
      }
      return result;
    });
  }

  /**
   * Admin fleet snapshot — every online rider with their last known location +
   * active delivery (if any). Used by the admin fleet map / dispatch dashboard.
   */
  async getFleet() {
    const riders = await this.prisma.riderProfile.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        userId: true,
        vehicleType: true,
        currentLat: true,
        currentLng: true,
        lastLocationAt: true,
        rating: true,
        user: { select: { firstName: true, lastName: true, phone: true } },
        deliveries: {
          where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            orderId: true,
            order: { select: { orderNumber: true, address: { select: { latitude: true, longitude: true } } } },
          },
        },
      },
    });

    return riders.map((r) => ({
      id: r.id,
      name: `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || 'Unknown',
      phone: r.user?.phone,
      vehicleType: r.vehicleType,
      rating: r.rating,
      location: r.currentLat != null && r.currentLng != null
        ? { lat: r.currentLat, lng: r.currentLng, updatedAt: r.lastLocationAt }
        : null,
      activeDelivery: r.deliveries[0]
        ? {
            id: r.deliveries[0].id,
            status: r.deliveries[0].status,
            orderId: r.deliveries[0].orderId,
            orderNumber: r.deliveries[0].order?.orderNumber,
            dropoff: r.deliveries[0].order?.address
              ? {
                  lat: (r.deliveries[0].order.address as any)?.latitude,
                  lng: (r.deliveries[0].order.address as any)?.longitude,
                }
              : null,
          }
        : null,
    }));
  }
}
