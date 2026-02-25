// src/modules/ai-engine/agents/base.agent.ts
export abstract class BaseAgent {
  abstract name: string;
  abstract execute(query: string, context?: any): Promise<string>;
}