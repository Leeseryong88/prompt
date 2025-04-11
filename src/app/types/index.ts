export interface PromptHistoryItem {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  executionResult: string | null;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface ParsedPrompt {
  mainPrompt: string;
  explanation: string | null;
} 