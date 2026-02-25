import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; 
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy';

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService, // ✨ Agora usamos o Prisma!
    private readonly modelSelector: ModelSelectorStrategy,
  ) {}

  // Recupera o que sabemos sobre o mestre
  async getUserContext(userId: string): Promise<string> {
    try {
      const memory = await this.prisma.userMemory.findUnique({
        where: { userId },
      });

      if (!memory || !memory.facts || memory.facts.length === 0) {
        return "Este é um novo utilizador. Sê acolhedor e foca-te na cultura de Angola.";
      }

      return `Contexto anterior do utilizador: ${memory.facts.join(', ')}.`;
    } catch (error) {
      console.error('Erro ao recuperar memória:', error);
      return "Contexto indisponível.";
    }
  }

  // Analisa a conversa e guarda factos novos
  async updateMemory(userId: string, lastUserMsg: string, aiResponse: string) {
    try {
      const lowerMsg = lastUserMsg.toLowerCase();
      let newFact = '';

      // Lógica Simples de Extração (Depois podemos usar a IA para isto)
      if (lowerMsg.includes('gosto de') || lowerMsg.includes('prefiro')) {
        newFact = `O utilizador mencionou interesse em: ${lastUserMsg}`;
      }

      if (newFact) {
        await this.prisma.userMemory.upsert({
          where: { userId },
          update: {
            facts: { push: newFact }
          },
          create: {
            userId,
            facts: [newFact]
          }
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar memória no Prisma:', error);
    }
  }
}