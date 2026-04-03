// src/modules/payment/dto/submit-receipt.dto.ts
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AccessType } from '@prisma/client';

export class SubmitReceiptDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsEnum(AccessType)
  plan: AccessType;

  @IsNotEmpty()
  @IsEnum(['monthly', 'semestral', 'yearly'])
  cycle: 'monthly' | 'semestral' | 'yearly';

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}