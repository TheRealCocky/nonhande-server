import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LlamaIndexService } from './llamaindex.service';
import { HuggingFaceStrategy } from '../strategies/huggingface.strategy';
import { DocumentAgent } from '../agents/document.agent';
import { TouristAgent } from '../agents/tourist.agent';
import { GeneralAgent } from '../agents/general.agent';
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy';
import { MemoryService } from './MemoryService';
import { AudioProcessingService } from './audio-processing.service';

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llamaIndex: LlamaIndexService,
    private readonly hf: HuggingFaceStrategy,
    private readonly docAgent: DocumentAgent,
    private readonly touristAgent: TouristAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly modelSelector: ModelSelectorStrategy,
    private readonly memoryService: MemoryService,
    private readonly audioService: AudioProcessingService,
  ) {}

  /**
   * Processa a pergunta do utilizador com Fallback de Duas Contas Groq:
   * 1. Groq Conta Principal (Chave 1)
   * 2. Groq Conta Backup (Chave 2) -> Mesma inteligência, nova quota.
   */
  async getSmartResponse(userQuery: string, userId: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();
    const userMemoryContext = await this.memoryService.getUserContext(userId);

    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    let finalResult;

    try {
      // --- 🚀 TENTATIVA 1: GROQ CONTA PRINCIPAL ---
      if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
        const result = await this.touristAgent.execute(userQuery, userMemoryContext);
        finalResult = {
          text: result.answer,
          agent: 'tourist',
          model: 'llama-3.3-70b',
          confidence: 0.95,
        };
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
        finalResult = {
          text: result.answer,
          agent: 'general',
          model: 'llama-3.3-70b',
          confidence: 0.90
        };
      }

    } catch (error) {
      // --- 🛡️ LÓGICA DE FALLBACK (PLANO B: GROQ SEGUNDA CONTA) ---
      if (error.message.includes('429') || error.message.includes('rate_limit')) {
        console.warn(`[Nonhande Fallback] Chave 1 esgotada. Ativando Segunda Conta Groq para ${userId}`);

        try {
          // 🎯 O SEGREDO: Passamos o sinal 'true' para os agentes usarem a GROQ_API_KEY_BACKUP
          // Nota: Precisas de ajustar os teus agents para aceitarem este 3º parâmetro
          const backupResult = await this.generalAgent.execute(userQuery, userMemoryContext, true);

          finalResult = {
            text: backupResult.answer,
            agent: 'groq_account_backup',
            model: 'llama-3.3-70b',
            confidence: 0.90,
            isFallback: true
          };
        } catch (backupError) {
          // Se as duas contas da Groq falharem...
          console.error(`[Nonhande Crítico] Ambas as contas Groq atingiram o limite.`);
          throw new InternalServerErrorException('Estamos com muito tráfego agora. Tenta novamente em breve!');
        }
      } else {
        throw new InternalServerErrorException('Erro no Orquestrador: ' + error.message);
      }
    }

    // 🧠 ATUALIZAÇÃO DE MEMÓRIA (Background)
    this.memoryService.updateMemory(userId, userQuery, finalResult.text, finalResult.agent).catch(err =>
      console.error('[Nonhande Memory] Erro:', err)
    );

    return finalResult;
  }

  /**
   * Orquestra o fluxo de voz (Usa HF apenas para Whisper)
   */
  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);

    // Whisper no HF continua firme e forte (não precisa de fallback de chat)
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
      text: result.text,
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
