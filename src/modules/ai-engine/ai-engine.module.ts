// src/modules/ai-engine/ai-engine.module.ts
import { Module } from '@nestjs/common';
import { AiChatController } from './controllers/ai-chat.controller';
import { AiMediaController } from './controllers/ai-media.controller';
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { LlamaIndexService } from './services/llamaindex.service';
import { AudioProcessingService } from './services/audio-processing.service';
import { GroqStrategy } from './strategies/groq.strategy';
import { HuggingFaceStrategy } from './strategies/huggingface.strategy';
import { DocumentAgent } from './agents/document.agent';
import { TouristAgent } from './agents/tourist.agent';
import { GeneralAgent } from './agents/general.agent'; // Adicionado
import { ModelSelectorStrategy } from './strategies/model-selector.strategy'; // Adicionado

@Module({
  controllers: [
    AiChatController,
    AiMediaController
  ],
  providers: [
    AiOrchestratorService,
    LlamaIndexService,
    AudioProcessingService,
    GroqStrategy,
    HuggingFaceStrategy,
    ModelSelectorStrategy, // Essencial para a lógica de custo/performance
    DocumentAgent,
    TouristAgent,
    GeneralAgent, // Essencial para o fallback de conversas gerais
  ],
  exports: [AiOrchestratorService],
})
export class AiEngineModule {}