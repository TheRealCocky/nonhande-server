import { PrismaClient, ChallengeType, AccessType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o plantio de dados (Seed)...');

  // 1. Criar Nível 1
  const level1 = await prisma.level.create({
    data: {
      title: 'Nível 1: Iniciante',
      description: 'As bases da língua Nhaneca',
      order: 1,
      units: {
        create: {
          title: 'Saudações e Cortesia',
          description: 'Aprende a cumprimentar em Nhaneca',
          order: 1,
          lessons: {
            create: [
              {
                title: 'Cumprimentos Básicos',
                order: 1,
                xpReward: 50,
                access: AccessType.FREE,
                challenges: {
                  create: [
                    {
                      type: ChallengeType.SELECT,
                      question: "Como se diz 'Bom dia'?",
                      content: {
                        options: ['Mene', 'Tyina', 'Komesho'],
                        correct: 'Mene'
                      }
                    },
                    {
                      type: ChallengeType.TRANSLATE,
                      question: "Traduza 'Mukwetu'",
                      content: {
                        correct: 'Amigo'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  });

  console.log('✅ Dados inseridos com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });