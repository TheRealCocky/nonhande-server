import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}

  async initSession(userId: string, dto: CreateRoomDto) {
    return this.prisma.call.create({
      data: {
        roomId: uuidv4(), // Gera um ID único para a sala
        title: dto.title || 'Conversa em Nhaneka',
        hostId: userId,
        isActive: true,
      },
    });
  }

  async getRoomStatus(roomId: string) {
    const room = await this.prisma.call.findUnique({ where: { roomId } });
    if (!room || !room.isActive) throw new NotFoundException('Sala não encontrada ou inativa');
    return room;
  }

  async endSession(roomId: string) {
    return this.prisma.call.update({
      where: { roomId },
      data: { isActive: false, endedAt: new Date() },
    });
  }
}