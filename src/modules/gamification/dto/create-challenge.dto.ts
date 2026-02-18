import { ActivityType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateChallengeDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  @IsNotEmpty()
  question: string;

  // Record<string, unknown> é o substituto seguro para objetos JSON
  // Indica que é um objeto, mas as chaves e valores são validados depois
  @IsObject()
  @IsNotEmpty()
  content: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsNumber()
  @IsNotEmpty()
  order: number;

  // Adicionando o metadata que planeámos para a IA
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}