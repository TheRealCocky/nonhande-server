import { Controller, Get } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('ping')
  async keepAlive() {
    try {
      // ⚡ Query ultra-leve para resetar o contador de pausa do Supabase
      // Apenas contamos um registo na tabela de palavras
      await this.prisma.word.count({ take: 1 });

      return {
        status: 'online',
        database: 'connected',
        message: 'Nonhande está acordado!',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        message: error.message,
      };
    }
  }
}