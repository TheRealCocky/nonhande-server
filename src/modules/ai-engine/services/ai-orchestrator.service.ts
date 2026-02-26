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
   * Processa a pergunta do utilizador, seleciona o agente adequado e gera a resposta.
   * Agora com Fallback automático para Hugging Face em caso de Rate Limit (429).
   */
  async getSmartResponse(userQuery: string, userId: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();

    // 🧠 RECUPERAÇÃO DE MEMÓRIA
    const userMemoryContext = await this.memoryService.getUserContext(userId);

    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    let finalResult;

    try {
      // --- TENTATIVA COM AGENTES (GROQ) ---
      if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
        const model = this.modelSelector.selectModel('tourist');
        const result = await this.touristAgent.execute(userQuery, userMemoryContext);

        finalResult = {
          text: result.answer,
          agent: result.agentUsed || 'tourist',
          model,
          confidence: result.confidence || 0.95,
        };
      }
      else if (forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
        const model = this.modelSelector.selectModel('document');
        const vector = await this.hf.generateEmbedding(userQuery);
        const culturalContext = await this.llamaIndex.searchCulturalContext(vector);

        const result = await this.docAgent.execute(userQuery, culturalContext, userMemoryContext);

        finalResult = {
          text: result.answer,
          sourceContext: culturalContext,
          agent: result.agentUsed || 'document_expert',
          model,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          confidence: result.confidence
        };
      }
      else {
        const model = this.modelSelector.selectModel('general');
        const result = await this.generalAgent.execute(userQuery, userMemoryContext);

        finalResult = {
          text: result.answer,
          agent: result.agentUsed || 'general',
          model,
          confidence: result.confidence
        };
      }

    } catch (error) {
      // --- 🛡️ LÓGICA DE FALLBACK (PLANO B) ---
      // Se a Groq der erro de limite (429) ou erro de sobrecarga
      if (error.message.includes('429') || error.message.includes('rate_limit')) {
        console.warn(`[Nonhande Fallback] Rate Limit na Groq. Ativando Hugging Face para o user ${userId}`);

        // Criamos uma instrução rápida para o backup não perder a identidade
        const backupSystemInstruction = `
          Tu és a Nonhande AI (Modo de Segurança). 
          Responde de forma direta e útil sobre Angola/Cultura Nhaneka.
          Histórico do utilizador: ${userMemoryContext}
        `;

        const backupAnswer = await this.hf.getChatCompletion(userQuery, backupSystemInstruction);

        finalResult = {
          text: backupAnswer,
          agent: 'hf_backup',
          model: 'Qwen-2.5-72B', // Definido no teu HF Strategy
          confidence: 0.85,
          isFallback: true
        };
      } else {
        // Se for outro erro qualquer, lança para o log do sistema
        throw new InternalServerErrorException('Erro no Orchestrator: ' + error.message);
      }
    }

    // 🧠 ATUALIZAÇÃO DE MEMÓRIA (Background Task)
    this.memoryService.updateMemory(userId, userQuery, finalResult.text, finalResult.agent).catch(err =>
      console.error('[Nonhande IA] Erro ao atualizar memória:', err)
    );

    return finalResult;
  }

  /**
   * Orquestra o fluxo de voz: Transcrição -> Inteligência -> Preparação para Fala
   */
  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);
    let transcribedText = await this.hf.transcribeAudio(processedBuffer);

    const phoneticMap: Record<string, string> = {
      'duende': 'tuende', 'kowila': 'ko huila', 'er det': 'ekumbi',
      'kombi': 'ekumbi', 'conbi': 'ekumbi', 'tu em de': 'tuende'
    };

    Object.keys(phoneticMap).forEach((error) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      transcribedText = transcribedText.replace(regex, phoneticMap[error]);
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