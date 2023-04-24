export interface AgentAction {
  thought: string;
  tool: string;
  toolInput: string;
  raw?: string;
};

export interface AgentStep {
  action: AgentAction;
  result: string;
};

export interface Tool {
  name: string;
  description: string;
  call(arg: string): Promise<string>;
  examples?: AgentAction[];
}

export interface MemoryEntry {
  id: string; // UUID
  currentContent: string;
  step: AgentStep;
}

export type Memory = MemoryEntry[];
