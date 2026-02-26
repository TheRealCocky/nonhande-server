import { Injectable } from '@nestjs/common';
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
   */
  async getSmartResponse(userQuery: string, userId: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();

    // 🧠 RECUPERAÇÃO DE MEMÓRIA: Traz o contexto histórico do utilizador
    const userMemoryContext = await this.memoryService.getUserContext(userId);

    // 🕵️ Detecção de intenção de documento/geração
    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    let finalResult;

    // 1. TURISMO (Foco no Sul e Locais)
    if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
      const model = this.modelSelector.selectModel('tourist');

      // O agente executa a lógica e o prompt dinâmico internamente
      const result = await this.touristAgent.execute(userQuery, userMemoryContext);

      finalResult = {
        text: result.answer,
        agent: result.agentUsed,
        model,
        confidence: result.confidence || 0.95,
      };
    }
    // 2. DOCUMENTOS / DICIONÁRIO / CULTURA (RAG com LlamaIndex)
    else if (forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
      const model = this.modelSelector.selectModel('document');
      const vector = await this.hf.generateEmbedding(userQuery);
      const culturalContext = await this.llamaIndex.searchCulturalContext(vector);

      const result = await this.docAgent.execute(userQuery, culturalContext, userMemoryContext);

      finalResult = {
        text: result.answer,
        sourceContext: culturalContext,
        agent: result.agentUsed,
        model,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        confidence: result.confidence
      };
    }
    // 3. PADRÃO (FALLBACK - Agent Geral)
    else {
      const model = this.modelSelector.selectModel('general');
      const result = await this.generalAgent.execute(userQuery, userMemoryContext);

      finalResult = {
        text: result.answer,
        agent: result.agentUsed,
        model,
        confidence: result.confidence
      };
    }

    // 🧠 ATUALIZAÇÃO DE MEMÓRIA (Background Task)
    this.memoryService.updateMemory(userId, userQuery, finalResult.text).catch(err =>
      console.error('[Nonhande IA] Erro ao atualizar memória:', err)
    );

    return finalResult;
  }

  /**
   * Orquestra o fluxo de voz: Transcrição -> Inteligência -> Preparação para Fala
   */
  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    // 1. Transcrição (Ouvir)
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);
    let transcribedText = await this.hf.transcribeAudio(processedBuffer);

    // 2. Camada de Normalização Fonética (Lógica Angolana)
    const phoneticMap: Record<string, string> = {
      'duende': 'tuende', 'kowila': 'ko huila', 'er det': 'ekumbi',
      'kombi': 'ekumbi', 'conbi': 'ekumbi', 'tu em de': 'tuende'
    };

    Object.keys(phoneticMap).forEach((error) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      transcribedText = transcribedText.replace(regex, phoneticMap[error]);
    });

    // 3. Inteligência com Memória (Pensar)
    const result = await this.getSmartResponse(transcribedText, userId);

    // 4. Preparação da Resposta de Voz (Falar)
    // Retorna null pois o Frontend usará a Web Speech API com o result.text
    const audioResponseUrl = await this.audioService.textToSpeech(result.text);

    // 5. Atualizar Memória em Background
    this.memoryService.updateMemory(userId, transcribedText, result.text).catch(err =>
      console.error('[Nonhande IA] Erro ao gravar memória de voz:', err)
    );

    return {
      transcription: transcribedText,
      audioUrl: audioResponseUrl, // Será null para Web Speech API no Frontend
      text: result.text,          // O texto que será lido em voz alta
      ...result                   // Resto dos dados (agente, modelo, context, etc.)
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