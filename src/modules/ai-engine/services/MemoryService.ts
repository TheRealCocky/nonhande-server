import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModelSelectorStrategy } from '../strategies/model-selector.strategy';

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelSelector: ModelSelectorStrategy,
  ) {}

  /**
   * Validação interna para evitar Malformed ObjectID (Erro P2023)
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  async getUserContext(userId: string): Promise<string> {
    // 🛡️ Proteção contra IDs temporários (ex: 'utilizador_logado')
    if (!this.isValidObjectId(userId)) {
      return "Novo utilizador. Sê acolhedor e foca-te na cultura de Angola.";
    }

    try {
      const [memory, recentHistory] = await Promise.all([
        this.prisma.userMemory.findUnique({ where: { userId } }),
        this.prisma.chatHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const conversation = recentHistory
        .reverse()
        .map((h) => `User: ${h.query} | Nonhande: ${h.answer}`)
        .join('\n');

      const facts = memory?.facts?.length
        ? `Factos sobre o mestre: ${memory.facts.join(', ')}.`
        : "Novo utilizador.";

      if (!conversation && !memory) {
        return "Este é um novo utilizador. Sê acolhedor e foca-te na cultura de Angola.";
      }

      return `
HISTÓRICO RECENTE:
${conversation}

---
MEMÓRIA DE LONGO PRAZO:
${facts}
      `.trim();
    } catch (error) {
      console.error('[Nonhande Memory] Erro ao recuperar contexto:', error);
      return "Contexto indisponível. Foca-te na cultura angolana.";
    }
  }

  async updateMemory(userId: string, lastUserMsg: string, aiResponse: string) {
    // 🛡️ Impede a criação de registros com IDs inválidos
    if (!this.isValidObjectId(userId)) return;

    try {
      await this.prisma.chatHistory.create({
        data: {
          userId,
          query: lastUserMsg,
          answer: aiResponse,
        }
      });

      const lowerMsg = lastUserMsg.toLowerCase();
      let newFact = '';

      if (lowerMsg.includes('gosto de') || lowerMsg.includes('prefiro') || lowerMsg.includes('sou de')) {
        newFact = `Interesse: ${lastUserMsg}`;
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
      console.error('[Nonhande Memory] Erro ao atualizar memória:', error);
    }
  }
}