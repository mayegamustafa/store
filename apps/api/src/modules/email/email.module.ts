import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { EmailController } from './email.controller';
import { ImprovmxService } from './improvmx.service';

@Module({
  imports: [SettingsModule],
  controllers: [EmailController],
  providers: [ImprovmxService],
  exports: [ImprovmxService],
})
export class EmailModule {}
