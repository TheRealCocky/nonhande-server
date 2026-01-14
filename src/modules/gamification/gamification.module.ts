import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GamificationService } from './services/gamification.service';
import { ProgressionService } from './services/progression.service';
import { GamificationController } from './controllers/gamification.controller';
import { ProgressionController } from './controllers/progression.controller';

@Module({
  imports: [PrismaModule], // Precisamos do Prisma para os services funcionarem
  controllers: [
    GamificationController,
    ProgressionController
  ],
  providers: [
    GamificationService,
    ProgressionService
  ],
  exports: [GamificationService, ProgressionService], // Opcional: permite usar noutros módulos
})
export class GamificationModule {}
