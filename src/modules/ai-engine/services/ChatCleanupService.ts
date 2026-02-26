import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChatCleanupService {
  private readonly logger = new Logger(ChatCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🧹 Limpeza Automática: Corre todos os domingos às 00:00
   * Apaga o histórico de conversas com mais de 30 dias.
   * Mantém a UserMemory (Factos) intacta, pois essa é a inteligência real.
   */
  @Cron(CronExpression.EVERY_WEEKEND)
  async handleHistoryCleanup() {
    this.logger.log('[Nonhande Cleanup] Iniciando limpeza de histórico antigo...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await this.prisma.chatHistory.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`[Nonhande Cleanup] Sucesso! Foram removidas ${result.count} mensagens antigas.`);
    } catch (error) {
      this.logger.error('[Nonhande Cleanup] Erro ao limpar histórico:', error.message);
    }
  }
}