import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { RidersModule } from './modules/riders/riders.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { FlashSalesModule } from './modules/flash-sales/flash-sales.module';
import { UploadModule } from './modules/upload/upload.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { StaffModule } from './modules/staff/staff.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ReelsModule } from './modules/reels/reels.module';
import { LiveStreamsModule } from './modules/live-streams/live-streams.module';
import { PosModule } from './modules/pos/pos.module';
import { SupportModule } from './modules/support/support.module';
import { BlogModule } from './modules/blog/blog.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ChatModule } from './modules/chat/chat.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { FeatureGuardModule } from './common/feature-guard/feature-guard.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Scheduler (for escrow release, abandoned cart, flash sales)  
    ScheduleModule.forRoot(),

    // Redis cache — falls back to in-memory cache if Redis is unreachable.
    // Deploy-hardening: a missing REDIS_URL or unreachable Redis should not
    // crash-loop the API. Log the degradation instead.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        // No REDIS_URL configured — use in-memory cache (single-process only).
        if (!redisUrl) {
          // eslint-disable-next-line no-console
          console.warn('[Cache] REDIS_URL not set — falling back to in-memory cache. Multi-process caching disabled.');
          return { ttl: 300_000 };
        }
        try {
          const url = new URL(redisUrl);
          const store = await redisStore({
            socket: {
              host: url.hostname,
              port: parseInt(url.port || '6379', 10),
              reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
              connectTimeout: 5000,
            },
            password: url.password || undefined,
          });
          return { store, ttl: 300_000 };
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.warn(
            `[Cache] Redis connection failed (${e?.message || e}) — falling back to in-memory cache.`,
          );
          return { ttl: 300_000 };
        }
      },
      inject: [ConfigService],
    }),

    // Core modules
    PrismaModule,
    FeatureGuardModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    SellersModule,
    RidersModule,
    DeliveryModule,
    AdminModule,
    NotificationsModule,
    ReviewsModule,
    CouponsModule,
    FlashSalesModule,
    UploadModule,
    StaffModule,
    SettingsModule,
    ReelsModule,
    LiveStreamsModule,
    PosModule,
    SupportModule,
    BlogModule,
    NewsletterModule,
    AnalyticsModule,
    ChatModule,
    WalletModule,
    TrackingModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
