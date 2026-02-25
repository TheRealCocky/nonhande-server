// src/modules/ai-engine/controllers/ai-chat.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';

@Controller('ai')
export class AiChatController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Post('chat')
  async chat(@Body() body: { message: string, userId: string }) {
    // Passa o userId que vem do frontend ou um default
    return await this.orchestrator.getSmartResponse(body.message, body.userId || 'default_user');
  }
}
