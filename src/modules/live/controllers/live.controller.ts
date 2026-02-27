import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { LiveService } from '../services/live.service';
import { CreateRoomDto } from '../dto/create-room.dto';

@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post('room')
  // Aqui podes adicionar o teu @UseGuards(JwtAuthGuard) se quiseres proteger
  async createRoom(@Body() dto: CreateRoomDto, @Req() req: any) {
    // Simulando userId do request, ajusta conforme o teu Auth
    const userId = req.user?.id || "ID_TESTE_MONGODB";
    return this.liveService.initSession(userId, dto);
  }

  @Get('room/:roomId')
  async checkRoom(@Param('roomId') roomId: string) {
    return this.liveService.getRoomStatus(roomId);
  }

  @Post('room/:roomId/end')
  async closeRoom(@Param('roomId') roomId: string) {
    return this.liveService.endSession(roomId);
  }
}