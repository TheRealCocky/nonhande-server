import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * 👤 OBTER MEU PERFIL COMPLETO
   */
  @Get('me')
  async getMe(@Request() req) {
    // O Passport JWT coloca o payload do token em req.user
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Identificação de utilizador ausente no token.');
    }

    return this.profileService.getProfile(userId);
  }

  /**
   * 📝 ATUALIZAR DADOS DO MEU PERFIL
   */
  @Patch('update')
  async updateMe(@Request() req, @Body() updateDto: UpdateProfileDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.profileService.update(userId, updateDto);
  }

  /**
   * ⚡ ESTATÍSTICAS RÁPIDAS (XP, Hearts, Streak)
   */
  @Get('stats')
  async getMyStats(@Request() req) {
    const userId = req.user?.id || req.user?.sub;
    return this.profileService.getStats(userId);
  }
}