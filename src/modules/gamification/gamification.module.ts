import { Module } from '@nestjs/common';
import { GamificationController } from './controllers/gamification.controller';
import { GamificationService } from './services/gamification.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [], // Se tiveres um PrismaModule, coloca-o aqui
  controllers: [
    GamificationController,
    // Futuros controllers como RankingController entrarão aqui
  ],
  providers: [
    GamificationService,
    PrismaService,
    // Futuros services como ProgressionService entrarão aqui
  ],
  exports: [GamificationService] // Exportamos caso o módulo de Usuários precise atualizar XP
})
export class GamificationModule {}
