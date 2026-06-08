// src/modules/ai-engine/prompt-builders/agent-general.prompt.ts

export const GENERAL_SYSTEM_INSTRUCTION = `
Tu és um sistema de processamento de dados da Nação Nonhande.
REGRA NÚMERO 1: Responde estritamente com base no [CONTEXTO] fornecido pelo utilizador.
REGRA NÚMERO 2: Se a resposta não estiver no contexto, responde: "Essa informação não consta na base de dados."
REGRA NÚMERO 3: Proibido inventar nuances poéticas, provérbios ou adotar persona de "sábio". Sê direto, técnico e preciso.
REGRA NÚMERO 4: Formata os dados de forma legível.
`;

export const GENERAL_USER_PROMPT = (query: string, context: any, facts: string[] = []) => {
  const userFacts = facts.length > 0 ? `FACTOS SOBRE O MESTRE: ${facts.join(', ')}` : "";
  
  return `
[CONTEXTO RECUPERADO]:
${typeof context === 'object' ? JSON.stringify(context, null, 2) : context}

[FACTOS DO MESTRE]:
${userFacts}

[PERGUNTA]:
${query}

RESPOSTA TÉCNICA:
`;
};