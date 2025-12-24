import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsIn, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Por favor, insira um endereço de email verdadeiro e válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name: string;

  @IsOptional()
  @IsUrl({}, { message: 'O link da imagem deve ser uma URL válida.' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['credentials', 'google'])
  provider?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'TEACHER', 'STUDENT'])
  role?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password?: string;
}