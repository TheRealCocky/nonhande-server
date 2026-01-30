import { PrismaClient, ChallengeType, AccessType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o plantio de dados (Nonhande Seed)...');

  // Limpar dados existentes para evitar duplicados (Opcional, mas recomendado em Dev)
  // await prisma.level.deleteMany();

  // 1. Criar Nível 1 - Nhaneca
  const level1 = await prisma.level.create({
    data: {
      title: 'Nível 1: Iniciante',
      description: 'As bases da língua Nhaneca (Huila/Namibe)',
      order: 1,
      language: 'nhaneca', // Campo obrigatório que adicionamos
      units: {
        create: {
          title: 'Saudações e Família',
          description: 'Aprende a cumprimentar e identificar parentes',
          order: 1,
          lessons: {
            create: [
              {
                title: 'Primeiros Contactos',
                order: 1,
                xpReward: 50,
                access: AccessType.FREE,
                challenges: {
                  create: [
                    {
                      type: ChallengeType.SELECT,
                      question: "Como se diz 'Bom dia' em Nhaneca?",
                      content: {
                        options: ['Mene', 'Tyina', 'Nawa'],
                        correct: 'Mene',
                        audioUrl: null, // Placeholder para futuro áudio no Supabase
                      },
                    },
                    {
                      type: ChallengeType.TRANSLATE,
                      question: "O que significa 'Tatekulu'?",
                      content: {
                        correct: 'Avô',
                        explanation: 'Termo de respeito para anciãos ou avôs.',
                      },
                    },
                    {
                      type: ChallengeType.ORDER,
                      question: "Ordene a frase: 'Estou bem'",
                      content: {
                        words: ['Nawa', 'ndyi', 'li'],
                        correctOrder: ['Ndyi', 'li', 'nawa'],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  console.log(`✅ Nível '${level1.title}' criado com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
