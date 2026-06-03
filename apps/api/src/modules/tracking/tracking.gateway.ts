import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LocationPayload {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  orderId?: string;
}

/**
 * Real-time GPS Tracking WebSocket Gateway
 *
 * Namespace: /tracking
 *
 * Events  client → server:
 *  rider:online        — rider connects and goes online
 *  rider:offline       — rider disconnects gracefully
 *  rider:location      — rider pushes GPS update (with orderId)
 *  track:order         — buyer/seller/admin subscribes to a specific order
 *  seller:watch_store  — seller subscribes to ALL their active orders
 *  admin:watch_all     — admin watches ALL active deliveries
 *
 * Events  server → client:
 *  rider:moved         — GPS update broadcast to all watchers of an order
 *  delivery:status     — status change for an order room
 *  rider:eta           — ETA update
 *  store:order_update  — sent to seller room when any of their orders moves
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private riderSockets = new Map<string, string>();  // riderId → socketId
  private riderLastLocation = new Map<string, number>(); // riderId → last update timestamp

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Attach Redis adapter so room broadcasts work across multiple API instances.
   * Without this, a rider connected to instance A cannot reach a buyer on instance B.
   *
   * Gracefully degrades: if @socket.io/redis-adapter is not installed or REDIS_URL
   * is unreachable, logs a warning and continues with the default in-memory adapter
   * (today's behavior). Disable explicitly via SOCKETIO_REDIS_ADAPTER=false.
   */
  async afterInit(server: Server) {
    const enabled = process.env.SOCKETIO_REDIS_ADAPTER !== 'false';
    const redisUrl = process.env.REDIS_URL;
    if (!enabled || !redisUrl) {
      this.logger.log('Socket.IO Redis adapter disabled — single-process broadcast only');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAdapter } = require('@socket.io/redis-adapter');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('ioredis');
      const pubClient = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: null });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (e: Error) => this.logger.error(`Redis pub error: ${e.message}`));
      subClient.on('error', (e: Error) => this.logger.error(`Redis sub error: ${e.message}`));
      server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.IO Redis adapter attached — cross-process broadcast enabled');
    } catch (e: any) {
      this.logger.warn(
        `Redis adapter not attached: ${e?.message || e}. ` +
        `Install with "npm install @socket.io/redis-adapter" in apps/api. ` +
        `Falling back to single-process in-memory adapter.`,
      );
    }
  }

  /**
   * Extract and verify JWT from socket handshake.
   * Accepts token from auth object or Authorization header.
   */
  private extractUser(client: Socket): { id: string; role: string } | null {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return null;
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const user = this.extractUser(client);
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.userId = user.id;
    client.data.role = user.role;
    this.logger.log(`authenticated: ${client.id} user=${user.id} role=${user.role}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`disconnected: ${client.id}`);
    for (const [riderId, sid] of this.riderSockets.entries()) {
      if (sid === client.id) {
        this.riderSockets.delete(riderId);
        await this.prisma.riderProfile.updateMany({
          where: { userId: riderId },
          data: { isOnline: false },
        }).catch(() => null);
        break;
      }
    }
  }

  // ── Rider: Go Online ──────────────────────────────────────────────────────────
  @SubscribeMessage('rider:online')
  async handleRiderOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { riderId: string },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || role !== 'RIDER') return;

    // Verify the riderId belongs to this user
    const profile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } }).catch(() => null);
    if (!profile || profile.id !== data.riderId) return;

    this.riderSockets.set(data.riderId, client.id);
    client.join(`rider:${data.riderId}`);
    await this.prisma.riderProfile.update({
      where: { id: data.riderId },
      data: { isOnline: true },
    }).catch(() => null);
    return { status: 'online' };
  }

  // ── Rider: Go Offline ─────────────────────────────────────────────────────────
  @SubscribeMessage('rider:offline')
  async handleRiderOffline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { riderId: string },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || role !== 'RIDER') return;

    const profile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } }).catch(() => null);
    if (!profile || profile.id !== data.riderId) return;

    this.riderSockets.delete(data.riderId);
    await this.prisma.riderProfile.update({
      where: { id: data.riderId },
      data: { isOnline: false },
    }).catch(() => null);
    return { status: 'offline' };
  }

  // ── Rider: Send GPS Location ──────────────────────────────────────────────────
  @SubscribeMessage('rider:location')
  async handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { riderId: string; location: LocationPayload },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || role !== 'RIDER') return;

    const { riderId, location } = data;

    // Verify the riderId belongs to this user
    const profile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } }).catch(() => null);
    if (!profile || profile.id !== riderId) return;

    // Validate coordinates
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number'
        || location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
      return;
    }

    // Throttle: max 1 location update per 2 seconds per rider
    const now = Date.now();
    const lastUpdate = this.riderLastLocation.get(riderId) || 0;
    if (now - lastUpdate < 2000) return;
    this.riderLastLocation.set(riderId, now);

    // Persist to DB
    await this.prisma.riderProfile.update({
      where: { id: riderId },
      data: { currentLat: location.lat, currentLng: location.lng, lastLocationAt: new Date() },
    }).catch(() => null);

    await this.prisma.riderLocationLog.create({
      data: { riderId, lat: location.lat, lng: location.lng, speed: location.speed, heading: location.heading },
    }).catch(() => null);

    const payload = {
      riderId,
      lat: location.lat,
      lng: location.lng,
      speed: location.speed,
      heading: location.heading,
      updatedAt: new Date().toISOString(),
    };

    // 1. Broadcast to all watchers of this specific order
    if (location.orderId) {
      this.server.to(`order:${location.orderId}`).emit('rider:moved', {
        orderId: location.orderId,
        ...payload,
      });

      // 2. Also broadcast to seller room for the order's seller
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: location.orderId },
          include: { items: { include: { product: { include: { seller: true } } } } },
        });
        if (order) {
          const sellerIds = [...new Set(order.items.map((i) => i.product.seller.userId))];
          for (const sellerId of sellerIds) {
            this.server.to(`seller:${sellerId}`).emit('store:order_update', {
              orderId: location.orderId,
              orderNumber: order.orderNumber,
              ...payload,
            });
          }
          // 3. Admin room always gets everything
          this.server.to('admin:tracking').emit('rider:moved', {
            orderId: location.orderId,
            ...payload,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to broadcast location for order ${location.orderId}: ${err.message}`);
      }
    }
  }

  // ── Buyer/Seller/Admin: Subscribe to specific order tracking ──────────────────
  @SubscribeMessage('track:order')
  async handleTrackOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; userId?: string },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId) return;

    // Verify the user has access to this order
    if (role === 'BUYER') {
      const order = await this.prisma.order.findFirst({ where: { id: data.orderId, buyerId: userId }, select: { id: true } }).catch(() => null);
      if (!order) return;
    } else if (role === 'RIDER') {
      const delivery = await this.prisma.delivery.findFirst({
        where: { orderId: data.orderId, rider: { userId } },
        select: { id: true },
      }).catch(() => null);
      if (!delivery) return;
    }
    // SELLER, ADMIN, SUPER_ADMIN can track any order

    client.join(`order:${data.orderId}`);

    // Send current rider position immediately
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId: data.orderId },
      include: { rider: true, order: { select: { address: true } } },
    }).catch(() => null);

    if (delivery?.rider?.currentLat) {
      client.emit('rider:moved', {
        orderId: data.orderId,
        riderId: delivery.riderId,
        lat: delivery.rider.currentLat,
        lng: delivery.rider.currentLng,
        updatedAt: delivery.rider.lastLocationAt,
      });
    }

    // Send delivery destination coordinates to the subscriber
    const address = delivery?.order?.address as any;
    if (address) {
      const destLat = address.latitude ?? address.lat;
      const destLng = address.longitude ?? address.lng;
      if (destLat && destLng) {
        client.emit('delivery:destination', {
          orderId: data.orderId,
          lat: parseFloat(destLat),
          lng: parseFloat(destLng),
          street: address.street ?? '',
          city: address.city ?? '',
        });
      }
    }

    return { status: 'tracking', deliveryStatus: delivery?.status ?? null };
  }

  // ── Seller: Watch all orders from their store ─────────────────────────────────
  @SubscribeMessage('seller:watch_store')
  async handleSellerWatchStore(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sellerId: string },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || !['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return;

    // Sellers can only watch their own store
    if (role === 'SELLER' && data.sellerId !== userId) return;

    // Join seller-specific room
    client.join(`seller:${data.sellerId}`);

    // Send snapshot of all currently active deliveries for this seller
    const activeOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['SHIPPED', 'OUT_FOR_DELIVERY'] },
        items: { some: { product: { seller: { userId: data.sellerId } } } },
      },
      include: {
        delivery: { include: { rider: true } },
      },
    }).catch(() => []);

    const snapshot = activeOrders
      .filter((o) => o.delivery?.rider?.currentLat)
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        riderId: o.delivery!.riderId,
        lat: o.delivery!.rider!.currentLat,
        lng: o.delivery!.rider!.currentLng,
        updatedAt: o.delivery!.rider!.lastLocationAt,
      }));

    client.emit('seller:orders_snapshot', snapshot);
    return { status: 'watching', activeOrders: snapshot.length };
  }

  // ── Admin: Watch ALL active deliveries ───────────────────────────────────────
  @SubscribeMessage('admin:watch_all')
  async handleAdminWatchAll(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || !['ADMIN', 'SUPER_ADMIN'].includes(role)) return;
    client.join('admin:tracking');

    const activeDeliveries = await this.prisma.delivery.findMany({
      where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
      include: {
        rider: true,
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    }).catch(() => []);

    const snapshot = activeDeliveries
      .filter((d) => d.rider?.currentLat)
      .map((d) => ({
        deliveryId: d.id,
        orderId: d.orderId,
        orderNumber: d.order.orderNumber,
        riderId: d.riderId,
        lat: d.rider!.currentLat,
        lng: d.rider!.currentLng,
        speed: null,
        heading: null,
        status: d.status,
        updatedAt: d.rider!.lastLocationAt,
      }));

    client.emit('admin:deliveries_snapshot', snapshot);
    return { status: 'watching', activeDeliveries: snapshot.length };
  }

  // ── Public: Broadcast delivery status change ──────────────────────────────────
  broadcastDeliveryStatus(orderId: string, status: string, extra?: any) {
    this.server.to(`order:${orderId}`).emit('delivery:status', {
      orderId, status, updatedAt: new Date().toISOString(), ...extra,
    });
    this.server.to('admin:tracking').emit('delivery:status', {
      orderId, status, updatedAt: new Date().toISOString(), ...extra,
    });
  }

  // ── Public: Notify rider of new delivery assignment ───────────────────────────
  notifyRiderNewDelivery(riderId: string, delivery: any) {
    this.server.to(`rider:${riderId}`).emit('delivery:new', delivery);
    this.server.to(`rider:${riderId}`).emit('delivery:assigned', delivery);
  }
}
