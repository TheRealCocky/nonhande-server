import { AiResponse } from '../interfaces/ai-response.interface';

export abstract class BaseAgent {
  abstract name: string;
  // Muda de Promise<string> para Promise<AiResponse>
  abstract execute(query: string, context?: any): Promise<AiResponse>;
}