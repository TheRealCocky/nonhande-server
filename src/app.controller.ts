import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'online',
      message: 'Nonhande API acordada!',
      timestamp: new Date().toISOString()
    };
  }
}