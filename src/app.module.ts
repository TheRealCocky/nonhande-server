import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { HealthController } from './health/health.controller';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module'; // <--- 1. Importa o módulo de IA

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DictionaryModule,
    GamificationModule,
    AiEngineModule, // <--- 2. Regista o módulo aqui
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
