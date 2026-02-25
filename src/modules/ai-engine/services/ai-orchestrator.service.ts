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

  // 1. Adiciona o userId como parâmetro obrigatório
  async getSmartResponse(userQuery: string, userId: string, forcedAgent?: string) {
    const queryLower = userQuery.toLowerCase();

    // 🧠 RECUPERAÇÃO DE MEMÓRIA: Antes de chamar qualquer agente
    // O contexto traz factos como: "O utilizador gosta da Huíla" ou "Prefere resumos curtos"
    const userMemoryContext = await this.memoryService.getUserContext(userId);

    // 🕵️ Detecção de intenção de documento
    const isDocRequest =
      queryLower.includes('gera') ||
      queryLower.includes('pdf') ||
      queryLower.includes('documento') ||
      queryLower.includes('faça');

    let finalResult;

    // 1. TURISMO
    if (forcedAgent === 'tourist' || (!forcedAgent && this.checkIfTouristIntent(queryLower))) {
      const model = this.modelSelector.selectModel('tourist');
      // Injetamos a memória no agente para ele saber com quem fala
      finalResult = await this.touristAgent.execute(userQuery, userMemoryContext);

      finalResult = {
        ...finalResult,
        model,
        text: finalResult.answer
      };
    }
    // 2. DOCUMENTOS / DICIONÁRIO
    else if (forcedAgent === 'document_expert' || isDocRequest || (!forcedAgent && this.checkIfCulturalIntent(queryLower))) {
      const model = this.modelSelector.selectModel('document');
      const vector = await this.hf.generateEmbedding(userQuery);
      const culturalContext = await this.llamaIndex.searchCulturalContext(vector);

      // O DocumentAgent recebe o contexto do RAG + a memória do utilizador
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
    // 3. PADRÃO (FALLBACK)
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
    // Analisa a interação atual para extrair novos factos sem bloquear a resposta
    this.memoryService.updateMemory(userId, userQuery, finalResult.text).catch(err =>
      console.error('Erro ao atualizar memória da Nonhande IA:', err)
    );

    return finalResult;
  }

  async handleVoiceQuery(audioFile: Express.Multer.File, userId: string) {
    // 1. Transcrição (Ouvir)
    // Usamos o buffer processado pelo seu AudioProcessingService
    const processedBuffer = await this.audioService.processAudioForTranscription(audioFile);
    let transcribedText = await this.hf.transcribeAudio(processedBuffer);

    // 2. Camada de Normalização Fonética Nonhande (Mantém a tua lógica excelente)
    const phoneticMap: Record<string, string> = {
      'duende': 'tuende', 'kowila': 'ko huila', 'er det': 'ekumbi',
      'kombi': 'ekumbi', 'conbi': 'ekumbi', 'tu em de': 'tuende'
    };

    Object.keys(phoneticMap).forEach((error) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      transcribedText = transcribedText.replace(regex, phoneticMap[error]);
    });

    // 3. Inteligência com Memória (Pensar)
    // Passamos o userId para o getSmartResponse buscar o histórico no MemoryService
    const result = await this.getSmartResponse(transcribedText, userId);

    // 4. Síntese de Voz (Falar)
    // Geramos o áudio da resposta da Nonhande IA
    // O audioService deve converter o texto em fala e devolver a URL do Cloudinary
    const audioResponseUrl = await this.audioService.textToSpeech(result.text);

    // 5. Atualizar Memória em Background
    // Não usamos 'await' aqui para a resposta ser mais rápida para o utilizador
    this.memoryService.updateMemory(userId, transcribedText, result.text).catch(err =>
      console.error('Erro ao gravar memória:', err)
    );

    return {
      transcription: transcribedText, // O que a IA ouviu
      audioUrl: audioResponseUrl,      // O link para o Frontend tocar o som
      ...result                        // Texto, agente usado, pdf (se houver), etc.
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