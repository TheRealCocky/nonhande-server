import {
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CompleteLessonDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsInt()
  @Min(0)
  @Max(100)
  score: number; // Percentagem de acerto (0 a 100)

  @IsOptional() // ✅ Permite que o campo não seja enviado
  @IsInt()      // ✅ Garante que se for enviado, seja um número inteiro
  @Min(0)
  @Max(5)
  hearts?: number;
}