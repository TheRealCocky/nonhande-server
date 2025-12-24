import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS (Essencial para o teu futuro Frontend conseguir conectar)
  app.enableCors();

  // Ativa a validação automática para todos os DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Remove campos que não estão no DTO
    forbidNonWhitelisted: true, // Dá erro se enviarem campos a mais
    transform: true,            // Converte tipos automaticamente
  }));

  // Porta definida pelo Render ou 3001 para desenvolvimento local
  const port = process.env.PORT || 3001;

  // No Docker/Render, é obrigatório usar '0.0.0.0' para aceitar conexões externas
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Nonhande Backend is running on: http://localhost:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
