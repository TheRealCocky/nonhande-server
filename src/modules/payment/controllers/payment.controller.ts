// src/modules/payment/controllers/payment.controller.ts
import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Get,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { SubmitReceiptDto } from '../dto/submit-receipt.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard) // Adicionamos o RolesGuard aqui para toda a classe
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 📤 Qualquer utilizador autenticado pode enviar o talão
   */
  @Post('submit')
  @UseInterceptors(FileInterceptor('file'))
  async submitReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitReceiptDto,
  ) {
    return this.paymentService.submit(dto, file);
  }

  /**
   * ✅ APENAS ADMIN pode aprovar o pagamento
   */
  @Patch('approve/:id')
  @Roles('ADMIN')
  async approve(
    @Param('id') id: string,
    @Body('cycle') cycle: 'monthly' | 'semestral' | 'yearly'
  ) {
    return this.paymentService.approve(id, cycle);
  }

  /**
   * 📜 Histórico de transações
   */
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.paymentService.getUserTransactions(userId);
  }
}