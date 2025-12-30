import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty({ message: 'O termo (palavra) é obrigatório' })
  term: string;

  @IsString()
  @IsNotEmpty({ message: 'O significado é obrigatório' })
  meaning: string;

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsOptional()
  language?: string = 'Nhaneca-Humbe';

  @IsString()
  @IsOptional()
  grammaticalType?: string;

  @IsString()
  @IsOptional()
  culturalNote?: string;

  /**
   * Como o multipart-form envia tudo como string,
   * validamos como string e fazemos o Parse no Service.
   */
  @IsOptional()
  @IsString()
  examples?: string;

  /**
   * Converte a string vinda do FormData (ex: "Tag1, Tag2")
   * num Array de strings real antes da validação.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== '');
    }
    return value;
  })
  @IsArray({ message: 'As tags devem ser enviadas como um array ou string separada por vírgulas' })
  tags?: string[];
}