/**
 * Delivery & Order Test Data Seeder
 * Creates buyers, riders, orders in various states, and assigns deliveries
 * to the demo rider (+256701000001) for testing the rider app.
 */

import { PrismaClient, OrderStatus, DeliveryStatus, PaymentMethod, PaymentStatus, RiderStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding delivery test data...\n');

  const password = await bcrypt.hash('Buyer@2024!', 10);
  const riderPassword = await bcrypt.hash('Rider@2024!', 10);

  // ─── 1. Create Buyer accounts ───────────────────────────────────────────────
  const buyers = await Promise.all([
    prisma.user.upsert({
      where: { phone: '+254700000001' },
      update: {},
      create: {
        firstName: 'Amara', lastName: 'Okonkwo',
        phone: '+254700000001', email: 'amara.okonkwo@demo.com',
        password, role: 'BUYER', status: 'ACTIVE', isPhoneVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '+234801234567' },
      update: {},
      create: {
        firstName: 'Kofi', lastName: 'Mensah',
        phone: '+234801234567', email: 'kofi.mensah@demo.com',
        password, role: 'BUYER', status: 'ACTIVE', isPhoneVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '+255744123456' },
      update: {},
      create: {
        firstName: 'Fatima', lastName: 'Diallo',
        phone: '+255744123456', email: 'fatima.diallo@demo.com',
        password, role: 'BUYER', status: 'ACTIVE', isPhoneVerified: true,
      },
    }),
  ]);
  console.log(`✅ ${buyers.length} buyers created`);

  // ─── 2. Create Rider accounts ────────────────────────────────────────────────
  const riderUser1 = await prisma.user.upsert({
    where: { phone: '+256701000001' },
    update: {},
    create: {
      firstName: 'David', lastName: 'Kirabo',
      phone: '+256701000001', email: 'rider.david@demo.com',
      password: riderPassword, role: 'RIDER', status: 'ACTIVE', isPhoneVerified: true,
    },
  });

  const riderUser2 = await prisma.user.upsert({
    where: { phone: '+256701000002' },
    update: {},
    create: {
      firstName: 'Grace', lastName: 'Nakato',
      phone: '+256701000002', email: 'rider.grace@demo.com',
      password: riderPassword, role: 'RIDER', status: 'ACTIVE', isPhoneVerified: true,
    },
  });

  const rider1 = await prisma.riderProfile.upsert({
    where: { userId: riderUser1.id },
    update: { status: RiderStatus.ACTIVE, isOnline: true },
    create: {
      userId: riderUser1.id,
      status: RiderStatus.ACTIVE,
      isOnline: true,
      vehicleType: 'motorcycle',
      vehiclePlate: 'UAZ 123K',
      licenseNo: 'LIC-DK-2024',
      currentLat: 0.3153,
      currentLng: 32.5816,
      rating: 4.8,
      totalDeliveries: 47,
    },
  });

  const rider2 = await prisma.riderProfile.upsert({
    where: { userId: riderUser2.id },
    update: { status: RiderStatus.ACTIVE, isOnline: true },
    create: {
      userId: riderUser2.id,
      status: RiderStatus.ACTIVE,
      isOnline: true,
      vehicleType: 'bicycle',
      vehiclePlate: 'UBZ 456M',
      licenseNo: 'LIC-GN-2024',
      currentLat: 0.3200,
      currentLng: 32.5950,
      rating: 4.6,
      totalDeliveries: 22,
    },
  });
  console.log(`✅ 2 riders created/updated (demo: +256701000001)`);

  // ─── 3. Create Addresses ─────────────────────────────────────────────────────
  const addrs = await Promise.all(buyers.map((buyer, i) => {
    const data = [
      { label: 'Home', fullName: buyer.firstName + ' ' + buyer.lastName, phone: buyer.phone!, addressLine1: '14 Kimathi Street', city: 'Nairobi', district: 'Nairobi Central', region: 'Nairobi', country: 'Kenya', latitude: -1.2864, longitude: 36.8172 },
      { label: 'Home', fullName: buyer.firstName + ' ' + buyer.lastName, phone: buyer.phone!, addressLine1: '22 Broad Street', city: 'Lagos', district: 'Lagos Island', region: 'Lagos', country: 'Nigeria', latitude: 6.4531, longitude: 3.3958 },
      { label: 'Home', fullName: buyer.firstName + ' ' + buyer.lastName, phone: buyer.phone!, addressLine1: '8 Uhuru Street', city: 'Dar es Salaam', district: 'Ilala', region: 'Dar es Salaam', country: 'Tanzania', latitude: -6.8161, longitude: 39.2803 },
    ][i];
    return prisma.address.create({ data: { userId: buyer.id, ...data } });
  }));
  console.log(`✅ ${addrs.length} addresses created`);

  // ─── 4. Get products from seed ────────────────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED, stock: { gt: 0 } },
    take: 10,
    include: { seller: true },
  });
  if (products.length === 0) throw new Error('No products found — run main seed first');
  console.log(`✅ Found ${products.length} products`);

  const pick = () => products[Math.floor(Math.random() * products.length)];

  // ─── 5. Helper: create order + delivery ──────────────────────────────────────
  let orderCount = 0;
  async function makeOrder(opts: {
    buyer: typeof buyers[0];
    address: typeof addrs[0];
    status: OrderStatus;
    payStatus: PaymentStatus;
    deliveryStatus?: DeliveryStatus;
    riderId?: string;
    suffix: string;
  }) {
    const p1 = pick();
    const p2 = pick();
    const items = [
      { product: p1, qty: 1 },
      ...(p2.id !== p1.id ? [{ product: p2, qty: 2 }] : []),
    ];
    const subtotal = items.reduce((s, i) => s + Number(i.product.basePrice) * i.qty, 0);
    const shipping = 5000;
    const total = subtotal + shipping;

    const orderNum = `TS-${new Date().getFullYear()}-${String(++orderCount + 100).padStart(4, '0')}-${opts.suffix}`;

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        buyerId: opts.buyer.id,
        addressId: opts.address.id,
        status: opts.status,
        subtotal,
        shippingFee: shipping,
        discount: 0,
        tax: 0,
        total,
        currency: 'KES',
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: opts.payStatus,
        items: {
          create: items.map(({ product: p, qty }) => ({
            productId: p.id,
            sellerId: p.sellerId,
            productName: p.name,
            productImage: (p.images as string[])?.[0] ?? null,
            price: p.basePrice,
            quantity: qty,
            subtotal: Number(p.basePrice) * qty,
            commission: Number(p.basePrice) * qty * 0.1,
          })),
        },
      },
    });

    if (opts.deliveryStatus !== undefined) {
      const now = new Date();
      await prisma.delivery.create({
        data: {
          orderId: order.id,
          riderId: opts.riderId ?? rider1.id,
          status: opts.deliveryStatus,
          pickupAddress: `${p1.name} pickup - ${opts.address.city}`,
          dropoffLat: opts.address.latitude,
          dropoffLng: opts.address.longitude,
          estimatedTime: new Date(now.getTime() + 45 * 60000),
          riderEarning: 3500,
          otp: String(Math.floor(1000 + Math.random() * 9000)),
          ...(opts.deliveryStatus === DeliveryStatus.PICKED_UP || opts.deliveryStatus === DeliveryStatus.IN_TRANSIT || opts.deliveryStatus === DeliveryStatus.DELIVERED
            ? { actualPickupAt: new Date(now.getTime() - 20 * 60000) }
            : {}),
          ...(opts.deliveryStatus === DeliveryStatus.DELIVERED
            ? { deliveredAt: new Date(now.getTime() - 5 * 60000) }
            : {}),
        },
      });
    }

    return order;
  }

  // ─── 6. Create orders in all lifecycle states ─────────────────────────────────
  console.log('\n📦 Creating test orders...\n');

  // New orders - just placed, no delivery yet
  const ord1 = await makeOrder({ buyer: buyers[0], address: addrs[0], status: OrderStatus.PENDING,         payStatus: PaymentStatus.PENDING,   suffix: 'P1' });
  console.log(`  🟡 PENDING        #${ord1.orderNumber}`);

  const ord2 = await makeOrder({ buyer: buyers[1], address: addrs[1], status: OrderStatus.CONFIRMED,       payStatus: PaymentStatus.COMPLETED, suffix: 'C1' });
  console.log(`  🔵 CONFIRMED      #${ord2.orderNumber}`);

  const ord3 = await makeOrder({ buyer: buyers[2], address: addrs[2], status: OrderStatus.PROCESSING,      payStatus: PaymentStatus.COMPLETED, suffix: 'PR1' });
  console.log(`  🔵 PROCESSING     #${ord3.orderNumber}`);

  // Active deliveries — assigned to demo rider (David Kirabo, +256701000001)
  const ord4 = await makeOrder({ buyer: buyers[0], address: addrs[0], status: OrderStatus.SHIPPED,         payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.ASSIGNED,   riderId: rider1.id, suffix: 'S1' });
  console.log(`  🟠 SHIPPED+ASSIGNED  #${ord4.orderNumber}  → David (demo rider)`);

  const ord5 = await makeOrder({ buyer: buyers[1], address: addrs[1], status: OrderStatus.SHIPPED,         payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.ASSIGNED,   riderId: rider1.id, suffix: 'S2' });
  console.log(`  🟠 SHIPPED+ASSIGNED  #${ord5.orderNumber}  → David (demo rider)`);

  const ord6 = await makeOrder({ buyer: buyers[2], address: addrs[2], status: OrderStatus.OUT_FOR_DELIVERY, payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.PICKED_UP,  riderId: rider1.id, suffix: 'OD1' });
  console.log(`  🟠 OUT_FOR_DELIVERY+PICKED_UP  #${ord6.orderNumber}  → David`);

  const ord7 = await makeOrder({ buyer: buyers[0], address: addrs[0], status: OrderStatus.OUT_FOR_DELIVERY, payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.IN_TRANSIT, riderId: rider1.id, suffix: 'OD2' });
  console.log(`  🚴 OUT_FOR_DELIVERY+IN_TRANSIT  #${ord7.orderNumber}  → David`);

  // A delivery for the second rider
  const ord8 = await makeOrder({ buyer: buyers[1], address: addrs[1], status: OrderStatus.OUT_FOR_DELIVERY, payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.IN_TRANSIT, riderId: rider2.id, suffix: 'OD3' });
  console.log(`  🚴 OUT_FOR_DELIVERY+IN_TRANSIT  #${ord8.orderNumber}  → Grace`);

  // Completed deliveries
  const ord9 = await makeOrder({ buyer: buyers[2], address: addrs[2], status: OrderStatus.DELIVERED,        payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.DELIVERED,  riderId: rider1.id, suffix: 'D1' });
  console.log(`  ✅ DELIVERED      #${ord9.orderNumber}  → David`);

  const ord10 = await makeOrder({ buyer: buyers[0], address: addrs[0], status: OrderStatus.DELIVERED,       payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.DELIVERED,  riderId: rider1.id, suffix: 'D2' });
  console.log(`  ✅ DELIVERED      #${ord10.orderNumber}  → David`);

  const ord11 = await makeOrder({ buyer: buyers[1], address: addrs[1], status: OrderStatus.DELIVERED,       payStatus: PaymentStatus.COMPLETED, deliveryStatus: DeliveryStatus.DELIVERED,  riderId: rider2.id, suffix: 'D3' });
  console.log(`  ✅ DELIVERED      #${ord11.orderNumber}  → Grace`);

  const ord12 = await makeOrder({ buyer: buyers[2], address: addrs[2], status: OrderStatus.CANCELLED,       payStatus: PaymentStatus.REFUNDED, suffix: 'CAN1' });
  console.log(`  ❌ CANCELLED      #${ord12.orderNumber}`);

  console.log(`\n✅ ${orderCount} orders created`);

  // ─── 7. Update rider totals ──────────────────────────────────────────────────
  await prisma.riderProfile.update({
    where: { id: rider1.id },
    data: { totalDeliveries: { increment: 4 } },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏍️  Demo rider login:  +256701000001 / Rider@2024!');
  console.log('👤  Demo buyer login:  +254700000001 / Buyer@2024!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nActive deliveries for demo rider (David):');
  console.log(`  - ${ord4.orderNumber}  status: ASSIGNED`);
  console.log(`  - ${ord5.orderNumber}  status: ASSIGNED`);
  console.log(`  - ${ord6.orderNumber}  status: PICKED_UP`);
  console.log(`  - ${ord7.orderNumber}  status: IN_TRANSIT`);
  console.log('\n🎉 Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
