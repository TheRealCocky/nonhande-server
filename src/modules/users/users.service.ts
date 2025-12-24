import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // PROCURAR POR EMAIL
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // CRIAR UTILIZADOR (Signup Manual)
  async create(data: CreateUserDto & { verificationCode?: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        avatarUrl: data.avatarUrl,
        provider: data.provider || 'credentials',
        role: (data.role as any) || 'STUDENT',
        verificationCode: data.verificationCode,
        isVerified: false, // Inicia como falso para registos manuais
      },
    });
  }

  // ATUALIZAR UTILIZADOR (Necessário para a verificação do código OTP)
  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }

  // LOGIN SOCIAL (Google)
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