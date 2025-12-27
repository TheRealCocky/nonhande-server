import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('StreamMonitor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const now = Date.now();

    this.logger.log(`🚀 [Início] ${method} ${url} - User: ${user?.email || 'Anon'}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const delay = Date.now() - now;
          this.logger.log(`✅ [Sucesso] ${method} ${url} - ${delay}ms`);
        },
        error: (err) => {
          const delay = Date.now() - now;
          this.logger.error(`❌ [Erro] ${method} ${url} - ${delay}ms - Motivo: ${err.message}`);
        },
      }),
    );
  }
}