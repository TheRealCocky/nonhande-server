import { Module } from '@nestjs/common';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 60 * 24,
      max: 100,
    }),
  ],
  controllers: [DictionaryController],
  providers: [DictionaryService, PrismaService],
})
export class DictionaryModule {}
