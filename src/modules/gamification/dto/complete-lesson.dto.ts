import { IsString, IsInt, Min, Max, IsNotEmpty } from 'class-validator';

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
}