import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser'; // Importante adicionar

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // 1. Aumentar limites para suportar áudio e contextos de IA
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;

  // O '0.0.0.0' é excelente para testares no teu telemóvel na mesma rede Wi-Fi
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Nonhande Backend is running on port ${port}`);
  console.log(`📡 CORS active for: ${frontendUrl}`);
}
bootstrap().catch((err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});
