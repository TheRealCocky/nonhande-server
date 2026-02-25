// src/modules/ai-engine/strategies/model-selector.strategy.ts
import { Injectable } from '@nestjs/common';

export enum AiModelTier {
  FAST = 'llama-3.1-8b-instant',      // Barato e ultra rápido
  POWERFUL = 'llama-3.3-70b-versatile', // O cérebro para Nhaneka/História
  VISION = 'llama-3.2-11b-vision-preview' // Caso queiras analisar fotos no futuro
}

@Injectable()
export class ModelSelectorStrategy {
  /**
   * Decide qual modelo usar com base na complexidade da tarefa
   */
  selectModel(intent: 'document' | 'tourist' | 'general'): string {
    switch (intent) {
      case 'document':
        return AiModelTier.POWERFUL; // Nhaneka precisa de mais parâmetros
      case 'tourist':
        return AiModelTier.POWERFUL; // Detalhes históricos exigem precisão
      case 'general':
      default:
        return AiModelTier.FAST; // Papo furado usa o modelo mais económico
    }
  }
}