import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { lessonProgress: { where: { completed: true } } }
        }
      }
    });

    if (!user) throw new NotFoundException('Utilizador não encontrado');

    // Removemos a password antes de enviar
    const { password, verificationCode, ...publicProfile } = user;
    return publicProfile;
  }

  async update(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // Estatísticas rápidas para o Dashboard do perfil
  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, streak: true, hearts: true }
    });
    return user;
  }
}