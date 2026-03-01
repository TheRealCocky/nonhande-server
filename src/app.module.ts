import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { HealthController } from './health/health.controller';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { ProfileModule } from './modules/profile/profile.module';
@Module({
  imports: [
    // ✨ 2. Regista o Schedule para a limpeza de histórico funcionar
    ScheduleModule.forRoot(),

    PrismaModule,
    AuthModule,
    UsersModule,
    DictionaryModule,
    GamificationModule,
    AiEngineModule,
    ProfileModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
