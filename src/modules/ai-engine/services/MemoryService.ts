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
   * 🧠 Recupera o contexto completo: Factos + Últimas 5 mensagens.
   * Isso permite que a IA resolva frases como "E como chego lá?".
   */
  async getUserContext(userId: string): Promise<string> {
    try {
      // 1. Fazemos as duas buscas em paralelo para ganhar milissegundos
      const [memory, recentHistory] = await Promise.all([
        this.prisma.userMemory.findUnique({ where: { userId } }),
        this.prisma.chatHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5, // Suficiente para manter o fio da meada sem "encher" o prompt
        }),
      ]);

      // 2. Formatamos o Histórico (da mais antiga para a mais recente)
      const conversation = recentHistory
        .reverse()
        .map((h) => `User: ${h.query} | Nonhande: ${h.answer}`)
        .join('\n');

      // 3. Formatamos os Factos
      const facts = memory?.facts?.length
        ? `Factos sobre o mestre: ${memory.facts.join(', ')}.`
        : "Novo utilizador.";

      // 4. Se não houver nada, damos a instrução padrão
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

  /**
   * 💾 Guarda a mensagem atual e extrai factos importantes.
   */
  async updateMemory(userId: string, lastUserMsg: string, aiResponse: string) {
    try {
      // 1. Guardar SEMPRE no Histórico (Obrigatório para continuidade)
      await this.prisma.chatHistory.create({
        data: {
          userId,
          query: lastUserMsg,
          answer: aiResponse,
          // Podes adicionar o agent aqui se quiseres tracking
        }
      });

      // 2. Extração de Factos Permanentes
      const lowerMsg = lastUserMsg.toLowerCase();
      let newFact = '';

      if (lowerMsg.includes('gosto de') || lowerMsg.includes('prefiro') || lowerMsg.includes('sou de')) {
        newFact = `Interesse: ${lastUserMsg}`;
      }

      // 3. Se for um facto novo, faz o Upsert na UserMemory
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