import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LlamaIndexService } from './llamaindex.service';
import { HuggingFaceStrategy } from '../strategies/huggingface.strategy';
import { DocumentAgent } from '../agents/document.agent';
import { TouristAgent } from '../agents/tourist.agent';
import { GeneralAgent } from '../agents/general.agent';
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy';
import { MemoryService } from './MemoryService';
import { AudioProcessingService } from './audio-processing.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '@prisma/client';

// ✅ Interface exportada para evitar erros no Controller
export interface SmartResponse {
  text: string;
  agent: string;
  model?: string;
  confidence?: number;
  sourceContext?: string;
  fileUrl?: string;
  fileName?: string;
  isFallback?: boolean;
  requiresUpgrade?: boolean;
}

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llamaIndex: LlamaIndexService,
    private readonly hf: HuggingFaceStrategy,
    private readonly docAgent: DocumentAgent,
    private readonly touristAgent: TouristAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly modelSelector: ModelSelectorStrategy,
    private readonly memoryService: MemoryService,
    private readonly audioService: AudioProcessingService,
  ) {}

  private readonly FREE_TOKEN_REGEN_TIME = 12 * 60 * 60 * 1000;
  private readonly MAX_FREE_TOKENS = 5;

  /**
   * 🔄 Sincroniza tokens (Garante que 'user' não seja nulo e evita duplicatas)
   */
  private async syncFreeTokens(user: User): Promise<User> {
    if (user.accessLevel !== 'FREE' || user.aiTokens >= this.MAX_FREE_TOKENS) {
      return user;
    }

    const now = new Date();
    const lastUpdate = user.lastTokenUpdate ?? user.createdAt;
    const elapsed = now.getTime() - lastUpdate.getTime();
    const tokensToAdd = Math.floor(elapsed / this.FREE_TOKEN_REGEN_TIME);

    if (tokensToAdd > 0) {
      const newTokens = Math.min(this.MAX_FREE_TOKENS, user.aiTokens + tokensToAdd);
      return await this.prisma.user.update({
        where: { id: user.id },
        data: {
          aiTokens: newTokens,
          lastTokenUpdate: new Date(lastUpdate.getTime() + (tokensToAdd * this.FREE_TOKEN_REGEN_TIME))
        }
      });
    }
    return user;
  }

  async getSmartResponse(userQuery: string, userId: string, forcedAgent?: string): Promise<SmartResponse> {
    const initialUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!initialUser) throw new NotFoundException('Mestre não encontrado.');

    const user: User = await this.syncFreeTokens(initialUser);

    if (user.accessLevel === 'FREE' && user.aiTokens <= 0) {
      return {
        text: "Os teus créditos da Nonhande IA acabaram. Eles renovam automaticamente a cada 12h, ou podes subir para Premium (5.000 Kz) para falar sem limites!",
        agent: 'system',
        requiresUpgrade: true
      };
    }

    const queryLower = userQuery.toLowerCase();
    const userMemoryContext = await this.memoryService.getUserContext(userId);
    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    let finalResult: SmartResponse;

    try {
      if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
        const result = await this.touristAgent.execute(userQuery, userMemoryContext);
        finalResult = { text: result.answer, agent: 'tourist', model: 'llama-3.3-70b', confidence: 0.95 };
      }
      else if (forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
        const vector = await this.hf.generateEmbedding(userQuery);
        const culturalContext = await this.llamaIndex.searchCulturalContext(vector);
        const result = await this.docAgent.execute(userQuery, culturalContext, userMemoryContext);

        finalResult = {
          text: result.answer,
          sourceContext: culturalContext,
          agent: 'document_expert',
          model: 'llama-3.3-70b',
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          confidence: result.confidence
        };
      }
      else {
        const result = await this.generalAgent.execute(userQuery, userMemoryContext);
        finalResult = { text: result.answer, agent: 'general', model: 'llama-3.3-70b', confidence: 0.90 };
      }

      if (user.accessLevel === 'FREE') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            aiTokens: { decrement: 1 },
            lastTokenUpdate: (user.aiTokens === 5) ? new Date() : (user.lastTokenUpdate ?? new Date()),
            totalTokensUsed: { increment: 1 }
          }
        });
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
        try {
          const backupResult = await this.generalAgent.execute(userQuery, userMemoryContext, true);
          finalResult = { text: backupResult.answer, agent: 'groq_account_backup', model: 'llama-3.3-70b', confidence: 0.90, isFallback: true };

          if (user.accessLevel === 'FREE') {
            await this.prisma.user.update({
              where: { id: userId },
              data: { aiTokens: { decrement: 1 }, totalTokensUsed: { increment: 1 } }
            });
          }
        } catch (backupError) {
          throw new InternalServerErrorException('Muita carga no sistema. Tenta daqui a pouco!');
        }
      } else {
        throw new InternalServerErrorException('Erro no Orquestrador: ' + errorMessage);
      }
    }

    this.memoryService.updateMemory(userId, userQuery, finalResult.text, finalResult.agent).catch(err =>
      console.error('[Memory] Erro:', err)
    );

    return finalResult;
  }

  /**
   * Orquestra o fluxo de voz
   */
  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);
    let transcribedText = await this.hf.transcribeAudio(processedBuffer);

    const phoneticMap: Record<string, string> = {
      'duende': 'tuende', 'kowila': 'ko huila', 'er det': 'ekumbi',
      'kombi': 'ekumbi', 'conbi': 'ekumbi', 'tu em de': 'tuende'
    };

    Object.keys(phoneticMap).forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      transcribedText = transcribedText.replace(regex, phoneticMap[term]);
    });

    const result = await this.getSmartResponse(transcribedText, userId);
    const audioResponseUrl = await this.audioService.textToSpeech(result.text);

    return {
      transcription: transcribedText,
      audioUrl: audioResponseUrl,

      ...result
    };
  }

  private checkIfTouristIntent(query: string): boolean {
    const touristKeywords = ['visitar', 'onde fica', 'turismo', 'província', 'huíla', 'hotel', 'monumento', 'namibe', 'benguela', 'serra da leba'];
    return touristKeywords.some(keyword => query.includes(keyword));
  }

  private checkIfCulturalIntent(query: string): boolean {
    const cultureKeywords = ['como se diz', 'tradução', 'nhaneka', 'humbi', 'significa', 'dicionário', 'cultura', 'tradição', 'vátua'];
    return cultureKeywords.some(keyword => query.includes(keyword));
  }
}
