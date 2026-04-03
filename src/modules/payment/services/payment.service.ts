// src/modules/payment/services/payment.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitReceiptDto } from '../dto/submit-receipt.dto';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class PaymentService {
  private supabase;

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração do Supabase (URL ou Secret Key) não encontrada no .env');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  private async uploadToSupabase(path: string, file: Express.Multer.File): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('receipts')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new BadRequestException(`Erro no Supabase: ${error.message}`);

    const { data: publicUrl } = this.supabase.storage
      .from('receipts')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  }

  private calculateAmount(plan: string, cycle: string): number {
    const basePrice = plan === 'PREMIUM' ? 5000 : 80000;
    if (cycle === 'semestral') return Math.floor(basePrice * 6 * 0.85);
    if (cycle === 'yearly') return Math.floor(basePrice * 12 * 0.70);
    return basePrice;
  }

  async submit(dto: SubmitReceiptDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('O comprovativo é obrigatório.');

    const fileName = `${Date.now()}_${file.originalname}`;
    const path = `payments/${dto.userId}/${fileName}`;

    const receiptUrl = await this.uploadToSupabase(path, file);
    const finalAmount = this.calculateAmount(dto.plan, dto.cycle);

    return this.prisma.transaction.create({
      data: {
        userId: dto.userId,
        amount: finalAmount,
        planType: dto.plan,
        receiptUrl: receiptUrl,
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

    return await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED', verifiedAt: startDate },
      }),
      this.prisma.user.update({
        where: { id: tx.userId },
        data: { accessLevel: tx.planType, aiTokens: tx.planType === 'PREMIUM' ? 2000 : 50000 },
      }),
      this.prisma.subscription.upsert({
        where: { userId: tx.userId },
        update: { plan: tx.planType, startDate, endDate, isActive: true },
        create: { userId: tx.userId, plan: tx.planType, startDate, endDate, isActive: true }
      })
    ]);
  }

  // ✅ ESTE MÉTODO PRECISA ESTAR DENTRO DA CLASSE
  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
} // <--- Garante que esta é a última chaveta do ficheiro