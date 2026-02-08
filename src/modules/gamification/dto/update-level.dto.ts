import { PartialType } from '@nestjs/mapped-types';
import { CreateChallengeDto } from './create-challenge.dto';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateLevelDto extends PartialType(CreateChallengeDto) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  order?: number;

  // Se o teu nível tiver XP total ou outros campos, adiciona aqui
}
