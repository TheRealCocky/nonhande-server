import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('class-summary')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getClassSummary() {
    return this.analyticsService.calculateClassGlobalStats();
  }

  @Get('student/:id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getStudentDetail(@Param('id') userId: string) {
    return this.analyticsService.getStudentPerformance(userId);
  }
}