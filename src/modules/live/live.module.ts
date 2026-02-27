import { Module } from '@nestjs/common';
import { LiveController } from './controllers/live.controller';
import { LiveService } from './services/live.service';
import { LiveGateway } from './gateways/live.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LiveController],
  providers: [LiveService, LiveGateway],
  exports: [LiveService],
})
export class LiveModule {}