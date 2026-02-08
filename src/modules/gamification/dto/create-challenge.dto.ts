import { ActivityType, AccessType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateChallengeDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsNotEmpty()
  content: any; // Pode ser string JSON ou objeto

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsNumber()
  order: number;
}