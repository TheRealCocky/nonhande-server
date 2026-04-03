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
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('submit')
  @UseInterceptors(FileInterceptor('file'))
  async submitReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitReceiptDto,
  ) {
    return this.paymentService.submit(dto, file);
  }

  @Patch('approve/:id')
  async approve(
    @Param('id') id: string,
    @Body('cycle') cycle: 'monthly' | 'semestral' | 'yearly'
  ) {
    return this.paymentService.approve(id, cycle);
  }

  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    // O Controller apenas delega a tarefa ao Service
    return this.paymentService.getUserTransactions(userId);
  }
}