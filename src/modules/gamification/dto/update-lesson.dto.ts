import { PartialType } from '@nestjs/mapped-types';
// 1. Removemos o .ts | 2. Fechamos a aspa | 3. Confirmamos o nome da classe exportada
import { CreateChallengeDto } from './create-challenge.dto';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

// Se a classe dentro de create-challenge.dto.ts se chamar CreateChallengeDto, usamos ela aqui:
export class UpdateLessonDto extends PartialType(CreateChallengeDto) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  order?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  xpReward?: number;
}