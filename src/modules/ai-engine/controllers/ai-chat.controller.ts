// 1. Adicionámos Get e Param aos imports
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';
import { PrismaService } from '../../../prisma/prisma.service'; // ✨ Importa o Prisma

@Controller('ai')
export class AiChatController {
  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly prisma: PrismaService // ✨ Injeta o Prisma aqui!
  ) {}

  /**
   * 💬 Chat via Texto
   */
  @Post('chat')
  async chat(
    @Body() body: {
      message: string;
      userId: string;
      agent?: string;
    }
  ) {
    const { message, userId, agent } = body;
    //🔍 LOG DE DEBUG: Vamos ver quem está a tentar falar
    console.log(`[Nonhande Debug] User: ${userId} | Msg: ${message} | Agent: ${agent}`);
    if (!message || !userId) {
      throw new BadRequestException('Mestre, faltam dados (mensagem ou userId).');
    }

    try {
      return await this.orchestrator.getSmartResponse(message, userId, agent);
    } catch (error) {
      console.error('[AiChatController] Erro:', error);
      throw new BadRequestException('A Nonhande teve um soluço técnico.');
    }
  }

  /**
   * 📜 Recupera o histórico de conversas do Mestre
   */
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    try {
      // Procuramos no MongoDB as últimas 20 interações
      return await this.prisma.chatHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } catch (error) {
      console.error('[AiChatController] Erro ao buscar histórico:', error);
      throw new BadRequestException('Não foi possível carregar o histórico.');
    }
  }
}
