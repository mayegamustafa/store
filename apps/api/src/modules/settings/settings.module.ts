import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { ConfigController } from './config.controller';
import { DynamicSettingsService } from './dynamic-settings.service';
import { AppConfigService } from './app-config.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController, ConfigController],
  providers: [DynamicSettingsService, AppConfigService],
  exports: [DynamicSettingsService, AppConfigService],
})
export class SettingsModule {}
