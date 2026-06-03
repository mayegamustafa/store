import { Module } from '@nestjs/common';
import { LiveStreamsController } from './live-streams.controller';
import { LiveStreamsService } from './live-streams.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LiveStreamsController],
  providers: [LiveStreamsService],
  exports: [LiveStreamsService],
})
export class LiveStreamsModule {}
