import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ProgressionService } from '../services/progression.service';
import { CompleteLessonDto } from '../dto/complete-lesson.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('progression')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    const user = await this.progressionService.getOrSyncStatus(userId);

    const now = new Date();
    const lastUpdate = user.lastHeartUpdate || now;
    const elapsed = now.getTime() - lastUpdate.getTime();
    const REGEN_TIME = 24 * 60 * 1000;

    let nextHeartInSeconds = 0;
    if (user.hearts < user.maxHearts) {
      nextHeartInSeconds = Math.max(0, Math.floor((REGEN_TIME - (elapsed % REGEN_TIME)) / 1000));
    }

    return {
      hearts: user.hearts,
      maxHearts: user.maxHearts,
      xp: user.xp,
      streak: user.streak,
      nextHeartInSeconds
    };
  }

  @Post('complete')
  async completeLesson(@Body() dto: CompleteLessonDto) {
    return this.progressionService.processLessonCompletion(dto);
  }

  @Post('mistake/:userId')
  async handleMistake(@Param('userId') userId: string) {
    const updatedUser = await this.progressionService.handleLoss(userId);
    return {
      message: 'Vida perdida!',
      heartsRemaining: updatedUser.hearts
    };
  }
}