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
   * Processa a pergunta do utilizador com lógica de Fallback Multinível:
   * 1. Groq Llama 3.3 70B (Principal)
   * 2. Groq Llama 3.1 8B (Reserva - Quota 5x maior)
   * 3. Hugging Face Mistral (Segurança)
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
      // --- TENTATIVA PRINCIPAL (GROQ 70B via Agentes) ---
      if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
        const result = await this.touristAgent.execute(userQuery, userMemoryContext);
        finalResult = {
          text: result.answer,
          agent: result.agentUsed || 'tourist',
          model: 'llama-3.3-70b',
          confidence: result.confidence || 0.95,
        };
      }
      else if (forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
        const vector = await this.hf.generateEmbedding(userQuery);
        const culturalContext = await this.llamaIndex.searchCulturalContext(vector);
        const result = await this.docAgent.execute(userQuery, culturalContext, userMemoryContext);

        finalResult = {
          text: result.answer,
          sourceContext: culturalContext,
          agent: result.agentUsed || 'document_expert',
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
          agent: result.agentUsed || 'general',
          model: 'llama-3.3-70b',
          confidence: result.confidence
        };
      }

    } catch (error) {
      // --- 🛡️ LÓGICA DE FALLBACK (PLANO B: GROQ 8B) ---
      if (error.message.includes('429') || error.message.includes('rate_limit')) {
        console.warn(`[Nonhande Fallback] Rate Limit no 70B. Tentando Llama 8B na Groq para ${userId}`);

        try {
          // Aqui usamos o GeneralAgent que é o mais leve para o fallback
          const backupResult = await this.generalAgent.execute(userQuery, userMemoryContext);

          finalResult = {
            text: backupResult.answer + "\n\n*(Modo de economia de energia ativo)*",
            agent: 'groq_8b_fallback',
            model: 'llama-3.1-8b-instant',
            confidence: 0.80,
            isFallback: true
          };
        } catch (backupError) {
          // --- 🛡️ PLANO C: HUGGING FACE (A ÚLTIMA LINHA) ---
          console.error(`[Nonhande Fallback] Groq 8B falhou também. Indo para Hugging Face.`);

          const backupSystemInstruction = `Tu és a Nonhande AI (Modo de Segurança). Contexto do mestre: ${userMemoryContext}`;
          const hfAnswer = await this.hf.getChatCompletion(userQuery, backupSystemInstruction);

          finalResult = {
            text: hfAnswer,
            agent: 'hf_backup',
            model: 'mistral-7b',
            confidence: 0.70,
            isFallback: true
          };
        }
      } else {
        throw new InternalServerErrorException('Erro no Orchestrator: ' + error.message);
      }
    }

    // 🧠 ATUALIZAÇÃO DE MEMÓRIA (Silenciosa)
    this.memoryService.updateMemory(userId, userQuery, finalResult.text, finalResult.agent).catch(err =>
      console.error('[Nonhande Memory] Erro ao atualizar:', err)
    );

    return finalResult;
  }

  /**
   * Orquestra o fluxo de voz
   */
  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);
    let transcribedText = await this.hf.transcribeAudio(processedBuffer);

    // Correção fonética para termos Nhaneka
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