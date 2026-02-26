import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';

@Controller('ai')
export class AiChatController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  /**
   * 💬 Chat via Texto: O portal principal da Nonhande
   * Recebe a mensagem, o ID do utilizador e, opcionalmente, o agente pretendido.
   */
  @Post('chat')
  async chat(
    @Body() body: {
      message: string;
      userId: string;
      agent?: string; // Opcional: 'tourist' | 'document_expert'
    }
  ) {
    const { message, userId, agent } = body;

    if (!message) {
      throw new BadRequestException('Mestre, a mensagem não pode estar vazia.');
    }

    if (!userId) {
      throw new BadRequestException('Identificação do utilizador (userId) é obrigatória para a memória.');
    }

    try {
      // Chamamos o orquestrador que agora já tem o sistema de memória embutido
      return await this.orchestrator.getSmartResponse(message, userId, agent);
    } catch (error) {
      console.error('[AiChatController] Erro na resposta da IA:', error);
      throw new BadRequestException('Lamentamos, Mestre. A Nonhande teve um soluço técnico.');
    }
  }
}
