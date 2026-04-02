// src/modules/payment/dto/submit-receipt.dto.ts
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { AccessType } from '@prisma/client';

export class SubmitReceiptDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsEnum(AccessType)
  plan: AccessType;

  @IsNotEmpty()
  @IsUrl()
  receiptUrl: string;

  @IsNotEmpty()
  @IsEnum(['monthly', 'semestral', 'yearly'])
  cycle: 'monthly' | 'semestral' | 'yearly'; // 👈 Adiciona isto!
}