import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DictionaryModule
  ],
  controllers: [AppController],
})
export class AppModule {}
