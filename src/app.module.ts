import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { GamificationModule } from './modules/gamification/gamification.module'; // 1. Importa aqui

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DictionaryModule,
    GamificationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
