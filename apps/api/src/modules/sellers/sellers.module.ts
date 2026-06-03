import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({ imports: [PrismaModule, NotificationsModule], controllers: [SellersController], providers: [SellersService], exports: [SellersService] })
export class SellersModule {}
