// src/modules/payment/services/payment.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitReceiptDto } from '../dto/submit-receipt.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  private calculateAmount(plan: string, cycle: string): number {
    const basePrice = plan === 'PREMIUM' ? 5000 : 80000;
    if (cycle === 'semestral') return Math.floor(basePrice * 6 * 0.85);
    if (cycle === 'yearly') return Math.floor(basePrice * 12 * 0.70);
    return basePrice;
  }

  async submit(dto: SubmitReceiptDto) {
    const finalAmount = this.calculateAmount(dto.plan, dto.cycle);

    return this.prisma.transaction.create({
      data: {
        userId: dto.userId,
        amount: finalAmount,
        planType: dto.plan,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
      },
    });
  }

  async approve(transactionId: string, cycle: 'monthly' | 'semestral' | 'yearly' = 'monthly') {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!tx) throw new NotFoundException('Transação não encontrada.');
    if (tx.status === 'COMPLETED') throw new BadRequestException('Esta transação já foi aprovada.');

    const startDate = new Date();
    const endDate = new Date();

    if (cycle === 'semestral') endDate.setMonth(startDate.getMonth() + 6);
    else if (cycle === 'yearly') endDate.setFullYear(startDate.getFullYear() + 1);
    else endDate.setMonth(startDate.getMonth() + 1);

    // O $transaction é usado para garantir atomicidade (ou faz tudo ou nada)
    return await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transactionId },
        // Agora o TS já não vai reclamar porque o campo existe no Client gerado
        data: {
          status: 'COMPLETED',
          verifiedAt: startDate,
        },
      }),
      this.prisma.user.update({
        where: { id: tx.userId },
        data: {
          accessLevel: tx.planType,
          aiTokens: tx.planType === 'PREMIUM' ? 2000 : 50000,
        },
      }),
      this.prisma.subscription.upsert({
        where: { userId: tx.userId },
        update: { plan: tx.planType, startDate, endDate, isActive: true },
        create: { userId: tx.userId, plan: tx.planType, startDate, endDate, isActive: true }
      })
    ]);
  }

  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}