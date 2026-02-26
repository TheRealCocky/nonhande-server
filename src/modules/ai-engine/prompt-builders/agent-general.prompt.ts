export const GENERAL_AGENT_PROMPT = (query: string, context: any, facts: string[] = []) => {
  const userFacts = facts.length > 0 ? `FACTOS SOBRE O MESTRE: ${facts.join(', ')}` : "";

  return `
Tu és a Nonhande AI...
${userFacts} 

[HISTÓRICO RECENTE]: ${context}
...
`;
};