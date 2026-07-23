import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrackingModule } from '../tracking/tracking.module';
import { DeliveryController } from './delivery.controller';
import { DeliveriesCompatController } from './deliveries-compat.controller';
import { DeliveryService } from './delivery.service';

@Module({ imports: [PrismaModule, NotificationsModule, TrackingModule], controllers: [DeliveryController, DeliveriesCompatController], providers: [DeliveryService], exports: [DeliveryService] })
export class DeliveryModule {}
