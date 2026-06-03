import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { WebhookEventsModule } from '../webhook-events/webhook-events.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MtnMomoProvider } from './providers/mtn-momo.provider';
import { AirtelMoneyProvider } from './providers/airtel-money.provider';
import { PesapalProvider } from './providers/pesapal.provider';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    WebhookEventsModule,
    forwardRef(() => WalletModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MtnMomoProvider, AirtelMoneyProvider, PesapalProvider],
  exports: [PaymentsService, PesapalProvider],
})
export class PaymentsModule {}
