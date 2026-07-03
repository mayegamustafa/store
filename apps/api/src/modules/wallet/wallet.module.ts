import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { EscrowService } from './escrow.service';
import { PayoutsService } from './payouts.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [WalletController],
  providers: [WalletService, EscrowService, PayoutsService],
  exports: [WalletService, EscrowService, PayoutsService],
})
export class WalletModule {}
