// Jest stand-in for the gitignored llmLocal.generated.ts: tests never load the real key.
export const LLM_LOCAL: {
  openaiApiKey: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
} = {
  openaiApiKey: '',
  openaiBaseUrl: '',
  anthropicApiKey: '',
};
