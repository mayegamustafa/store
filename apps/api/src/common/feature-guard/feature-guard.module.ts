import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FeatureGuard } from './feature.guard';

/**
 * Global module so controllers across the app can declare `@UseGuards(FeatureGuard)`
 * without each module needing to register the provider locally.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [FeatureGuard],
  exports: [FeatureGuard],
})
export class FeatureGuardModule {}
