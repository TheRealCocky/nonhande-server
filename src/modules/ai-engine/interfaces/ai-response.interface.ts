// src/modules/ai-engine/interfaces/ai-response.interface.ts
export interface AiResponse {
  answer: string;
  transcription?: string; // Para quando vier de áudio
  contextUsed?: any;      // Os documentos do Mongo
  agentUsed: string;      // Ex: 'tourist', 'document'
  confidence: number;
}