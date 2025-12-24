import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail(
    {},
    { message: 'Por favor, insira um endereço de email verdadeiro e válido.' },
  )
  @IsNotEmpty({ message: 'O email é obrigatório para fazer login.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha não pode estar vazia.' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  password: string;
}