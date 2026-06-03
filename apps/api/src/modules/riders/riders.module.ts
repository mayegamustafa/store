import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';

@Module({ imports: [PrismaModule, NotificationsModule, WalletModule], controllers: [RidersController], providers: [RidersService], exports: [RidersService] })
export class RidersModule {}
