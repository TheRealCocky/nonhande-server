// src/modules/payment/controllers/payment.controller.ts
import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Get,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { SubmitReceiptDto } from '../dto/submit-receipt.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 📤 O usuário envia o comprovativo do Multicaixa Express
   */
  @Post('submit')
  async submit(@Body() dto: SubmitReceiptDto) {
    return this.paymentService.submit(dto);
  }

  /**
   * ✅ Rota de Admin para aprovar o mambo e libertar o acesso
   * Nota: No futuro, adiciona um AdminGuard aqui.
   */
  @Patch('approve/:id')
  async approve(
    @Param('id') id: string,
    @Body('cycle') cycle: 'monthly' | 'semestral' | 'yearly'
  ) {
    return this.paymentService.approve(id, cycle);
  }

  /**
   * 📜 Histórico de transações para o perfil do usuário
   */
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.paymentService.getUserTransactions(userId);
  }
}