import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], // MUITO IMPORTANTE: Exportar o Service para o Auth usar
})
export class UsersModule {} // Adiciona o 'export' aqui