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
import { GeneralAgent } from './agents/general.agent';
import { ModelSelectorStrategy } from './strategies/model-selector.strategy';
import { DocumentGeneratorService } from './services/DocumentGeneratorService';
import { MemoryService } from './services/MemoryService';
import { ChatCleanupService } from './services/ChatCleanupService'; // ✨ Importado

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
    ModelSelectorStrategy,
    DocumentAgent,
    TouristAgent,
    GeneralAgent,
    DocumentGeneratorService,
    MemoryService,
    ChatCleanupService,
  ],
  exports: [AiOrchestratorService, MemoryService, GroqStrategy],
})
export class AiEngineModule {}