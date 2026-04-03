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
  // Inicialização do cliente Supabase seguindo o padrão do seu DictionaryService
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SECRET_KEY || '',
  );

  // Busca o nome do bucket das variáveis de ambiente (ex: receipts ou o que estiver no .env)
  private readonly bucketName = process.env.SUPABASE_BUCKET || 'receipts';

  constructor(private prisma: PrismaService) {}

  /**
   * Upload segue a lógica de pastas: payments/{userId}/nome-arquivo
   */
  private async uploadToSupabase(file: Express.Multer.File, userId: string): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
    const path = `payments/${userId}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Erro Storage (Pagamento): ${error.message}`);
    }

    // Retorna a URL pública exatamente como no DictionaryService
    return this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path).data.publicUrl;
  }

  private calculateAmount(plan: string, cycle: string): number {
    const basePrice = plan === 'PREMIUM' ? 5000 : 80000;
    if (cycle === 'semestral') return Math.floor(basePrice * 6 * 0.85);
    if (cycle === 'yearly') return Math.floor(basePrice * 12 * 0.70);
    return basePrice;
  }

  async submit(dto: SubmitReceiptDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('O comprovativo é obrigatório.');

    // Faz o upload usando a função padronizada
    const receiptUrl = await this.uploadToSupabase(file, dto.userId);
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

    // Lógica de cálculo de datas
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
        data: {
          accessLevel: tx.planType,
          aiTokens: tx.planType === 'PREMIUM' ? 2000 : 50000
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