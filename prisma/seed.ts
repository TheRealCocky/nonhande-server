// prisma/seed.ts
import { PrismaClient, ActivityType, AccessType } from '@prisma/client'; // ✅ Mudou aqui

const prisma = new PrismaClient();

async function main() {
  // Exemplo de como deve ficar a estrutura no seed:
  await prisma.level.create({
    data: {
      title: 'Nível 1',
      order: 1,
      language: 'nhaneca',
      units: {
        create: {
          title: 'Introdução',
          order: 1,
          lessons: {
            create: {
              title: 'Saudações',
              order: 1,
              xpReward: 10,
              access: AccessType.FREE,
              activities: { // ✅ Mudou de 'challenges' para 'activities'
                create: [
                  {
                    order: 1,
                    type: ActivityType.THEORY, // ✅ Mudou para ActivityType
                    question: 'Bem-vindo ao Nhaneca',
                    content: { body: 'Aprenda a dizer Olá.' }
                  },
                  {
                    order: 2,
                    type: ActivityType.SELECT,
                    question: 'Como se diz Olá?',
                    content: { options: ['Moro', 'Peras'], correct: 'Moro' }
                  }
                ]
              }
            }
          }
        }
      }
    }
  });
}
