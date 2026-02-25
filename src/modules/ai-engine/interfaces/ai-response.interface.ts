export interface AiResponse {
  answer: string;
  transcription?: string; // Para quando vier de áudio
  contextUsed?: any;      // Os documentos do Mongo (RAG)
  agentUsed: string;      // Ex: 'tourist', 'document_expert'
  confidence: number;

  // 📄 NOVOS CAMPOS PARA O LEGADO (PDFs)
  fileUrl?: string;       // Link do Cloudinary
  fileName?: string;      // Ex: "historia_angola.pdf"
}