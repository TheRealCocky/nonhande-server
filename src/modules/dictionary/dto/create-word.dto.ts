import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsEnum,
} from 'class-validator';

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

  // Como o multipart-form envia tudo como string,
  // validamos como string e fazemos o Parse no Service
  @IsOptional()
  examples?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}