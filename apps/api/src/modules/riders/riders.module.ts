import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { VerificationService } from './verification.service';

@Module({ imports: [PrismaModule, NotificationsModule, WalletModule], controllers: [RidersController], providers: [RidersService, VerificationService], exports: [RidersService, VerificationService] })
export class RidersModule {}
