import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GamificationService } from './services/gamification.service';
import { ProgressionService } from './services/progression.service';
import { GamificationController } from './controllers/gamification.controller';
import { ProgressionController } from './controllers/progression.controller';
import { RankingController } from './controllers/ranking.controller';
import { RankingService } from './services/ranking.service';

@Module({
  imports: [PrismaModule], // Precisamos do Prisma para os services funcionarem
  controllers: [
    GamificationController,
    ProgressionController,
    RankingController
  ],
  providers: [
    GamificationService,
    ProgressionService,
    RankingService,
  ],
  exports: [GamificationService, ProgressionService], // Opcional: permite usar noutros módulos
})
export class GamificationModule {}
