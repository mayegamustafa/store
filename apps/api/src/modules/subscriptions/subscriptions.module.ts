import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsCron } from './subscriptions.cron';
import { SubscriptionReceiptsService } from './receipts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PesapalProvider } from '../payments/providers/pesapal.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [SubscriptionsService, SubscriptionsCron, SubscriptionReceiptsService, PesapalProvider],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
