import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * PROCURAR POR EMAIL
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * CRIAR UTILIZADOR (Versão Flexível)
   * Usa Prisma.UserCreateInput para aceitar isVerified e Role vindos do AuthService
   */
  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data: data, // Agora ele aceita tudo: Role, isVerified, etc.
    });
  }

  /**
   * ATUALIZAR UTILIZADOR
   */
  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }

  /**
   * LOGIN SOCIAL (Google)
   */
  async findOrCreateGoogleUser(userData: any) {
    let user = await this.findByEmail(userData.email);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
          googleId: userData.googleId,
          provider: 'google',
          role: 'STUDENT',
          isVerified: true, // Google já verificou o e-mail
        },
      });
    }
    return user;
  }
}