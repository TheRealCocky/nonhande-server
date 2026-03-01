import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request as NestRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { RankingService } from '../services/ranking.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('gamification/ranking')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('global')
  async getGlobal(@Query('limit') limit: string) {
    return this.rankingService.getGlobalRanking(limit ? parseInt(limit) : 10);
  }

  @Get('streaks')
  async getStreaks(@Query('limit') limit: string) {
    return this.rankingService.getStreakRanking(limit ? parseInt(limit) : 10);
  }

  @Get('my-position')
  async getMyPosition(@NestRequest() req) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Mestre, não foi possível identificar o teu rastro no círculo.');
    }

    return this.rankingService.getUserPosition(userId);
  }
}