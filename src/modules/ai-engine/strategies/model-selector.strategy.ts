import { Injectable } from '@nestjs/common';
import * as process from 'node:process';

export enum AiModelTier {
  FAST = 'llama-3.1-8b-instant',          // Económico, ideal para turismo e conversas
  POWERFUL = 'llama-3.3-70b-versatile',     // Reservado para RAG e Cultura Nhaneka
  VISION = 'llama-3.2-11b-vision-preview'   // Para processamento de imagem
}

@Injectable()
export class ModelSelectorStrategy {
  /**
   * Decide o modelo com base na intenção e no estado do sistema (STRICT_ECONOMY).
   */
  selectModel(intent: string): string {
    // 🛡️ MODO DE EMERGÊNCIA: Se o Rate Limit estiver apertado, usamos sempre o mais barato.
    if (process.env.STRICT_ECONOMY === 'true') {
      return AiModelTier.FAST;
    }

    // 🎯 ESTRATÉGIA ATUAL:
    // Apenas 'document' (RAG/Dicionário/Cultura) usa o modelo pesado de 70B.
    // 'tourist' e 'general' agora usam o 8B para poupar tokens.
    return intent === 'document' || intent === 'document_expert'
      ? AiModelTier.POWERFUL
      : AiModelTier.FAST;
  }
}