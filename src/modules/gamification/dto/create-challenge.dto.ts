import { IsString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';
import { ChallengeType, AccessType } from '@prisma/client';

// --- DTO PARA CRIAR O DESAFIO ---
export class CreateChallengeDto {
  @IsEnum(ChallengeType)
  @IsNotEmpty()
  type: ChallengeType;

  @IsString()
  @IsNotEmpty()
  question: string;

  /**
   * No Controller, vamos converter a String do Multipart para Object.
   * O Content deve seguir padrões dependendo do tipo:
   * SELECT: { options: string[], correct: string }
   * ORDER: { words: string[], correctOrder: string[] }
   * VOICE: { transcript: string, audioUrl?: string }
   */
  @IsObject()
  @IsNotEmpty()
  content: any;

  @IsString()
  @IsNotEmpty()
  lessonId: string;
}

// --- NOVO: DTO PARA CRIAR LIÇÃO (Faltava este!) ---
export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsInt()
  @Min(5)
  @Max(50)
  xpReward: number;

  @IsEnum(AccessType)
  @IsOptional()
  access: AccessType = AccessType.FREE;

  @IsString()
  @IsNotEmpty()
  unitId: string;
}