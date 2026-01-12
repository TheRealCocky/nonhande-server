import { IsString, IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { ChallengeType } from '@prisma/client';

export class CreateChallengeDto {
  @IsEnum(ChallengeType)
  @IsNotEmpty()
  type: ChallengeType; // SELECT, TRANSLATE, ORDER, PAIRS, VOICE

  @IsString()
  @IsNotEmpty()
  question: string; // Ex: "Como se diz 'Amigo' em Nhaneca?"

  @IsObject()
  @IsNotEmpty()
  content: any;
  /* Exemplo de estrutura para o content:
    {
      "options": ["Mukwetu", "Ekwatya", "Omunu"],
      "correct": "Mukwetu",
      "audioUrl": "..."
    }
  */

  @IsString()
  @IsNotEmpty()
  lessonId: string;
}