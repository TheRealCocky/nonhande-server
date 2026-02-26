import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroqStrategy } from '../strategies/groq.strategy';
@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService,
  private readonly groq: GroqStrategy,
  ) {}

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  async getUserContext(userId: string): Promise<string> {
    if (!this.isValidObjectId(userId)) {
      return "Novo utilizador. Sê acolhedor e foca-te na cultura de Angola.";
    }

    try {
      const [memory, recentHistory] = await Promise.all([
        this.prisma.userMemory.findUnique({ where: { userId } }),
        this.prisma.chatHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ]);

      const conversation = recentHistory
        .reverse()
        .map((h) => `User: ${h.query} | Nonhande (${h.agent || 'geral'}): ${h.answer}`)
        .join('\n');

      const facts = memory?.facts?.length
        ? `Factos sobre o mestre: ${memory.facts.join(', ')}.`
        : "Sem factos registados.";

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

  async extractAndSaveFacts(userId: string, history: any[]) {
    // 1. Só corremos isto se houver histórico suficiente (ex: a cada 10 mensagens)
    if (history.length < 10) return;

    const conversationText = history.map(h => h.query).join(" | ");

    // 2. Pedimos a uma IA rápida (Groq/Llama) para resumir em 3 pontos
    const extractionPrompt = `Extrai 3 factos curtos sobre as preferências deste utilizador baseando-te nisto: ${conversationText}. Responde apenas com os factos separados por vírgulas.`;

    const facts = await this.groq.getChatCompletion(extractionPrompt, "És um extrator de dados.");

    // 3. Guardar no teu modelo UserMemory (MongoDB)
    await this.prisma.userMemory.upsert({
      where: { userId },
      update: { facts: { push: facts.split(',') } },
      create: { userId, facts: facts.split(',') }
    });
  }

  // ✨ Adicionámos o parâmetro 'agent' para persistência correta
  async updateMemory(userId: string, lastUserMsg: string, aiResponse: string, agent?: string) {
    if (!this.isValidObjectId(userId)) return;

    try {
      // 1. Salva o Episódio (Histórico)
      await this.prisma.chatHistory.create({
        data: {
          userId,
          query: lastUserMsg,
          answer: aiResponse,
          agent: agent || 'general', // ✨ Agora o banco sabe quem respondeu
        }
      });

      // 2. Extração de Factos (Memória de Longo Prazo)
      const lowerMsg = lastUserMsg.toLowerCase();
      let newFact = '';

      // Lógica de extração simples - Pode ser melhorada com IA depois
      if (lowerMsg.includes('gosto de') || lowerMsg.includes('prefiro') || lowerMsg.includes('sou de')) {
        newFact = lastUserMsg.trim();
      }

      if (newFact) {
        // Limpeza básica: remove pontos finais e espaços extras
        const cleanFact = newFact.replace(/[.!]/g, '').trim();

        await this.prisma.userMemory.upsert({
          where: { userId },
          update: {
            // Usar set com filtro para evitar duplicados seria o ideal,
            // mas o push resolve se limpares antes.
            facts: { push: cleanFact },
            updatedAt: new Date(),
          },
          create: { userId, facts: [cleanFact] }
        });
      }
    } catch (error) {
      console.error('[Nonhande Memory] Erro ao atualizar memória:', error);
    }
  }
}