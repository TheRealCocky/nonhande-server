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

  // NOVO: Campo opcional para o Infinitivo
  @IsString()
  @IsOptional()
  infinitive?: string;

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
   * Exemplos em formato JSON string
   */
  @IsOptional()
  @IsString()
  examples?: string;

  /**
   * Tags Normais (Categorização)
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((t) => t.trim()).filter((t) => t !== '');
    }
    return value;
  })
  @IsArray()
  tags?: string[];

  /**
   * NOVO: searchTags (Variações para busca e links cruzados)
   * Aceita "ndyilya, tulya, okulya" e converte para ["ndyilya", "tulya", "okulya"]
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((t) => t.trim()).filter((t) => t !== '');
    }
    return value;
  })
  @IsArray({ message: 'As searchTags devem ser enviadas como um array ou string separada por vírgulas' })
  searchTags?: string[];
}