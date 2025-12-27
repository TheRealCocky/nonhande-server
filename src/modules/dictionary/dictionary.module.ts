import { Module } from '@nestjs/common';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DictionaryController],
  providers: [DictionaryService, PrismaService],
})
export class DictionaryModule {}
