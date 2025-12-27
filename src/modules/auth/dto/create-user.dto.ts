import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client'; // Importa o Enum que definimos no Prisma

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name: string;

  @IsEmail({}, { message: 'Insira um e-mail válido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @IsOptional() // Opcional se for login social, mas obrigatório no teu caso manual
  password?: string;

  @IsEnum(Role, { message: 'O cargo deve ser ADMIN, TEACHER ou STUDENT.' })
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}