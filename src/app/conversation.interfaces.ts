import { createEmptySurfaceState } from './a2ui-parser';
import { DemoAgentMode } from './demo-agent.config';
import { ChatMessage, RenderableCommerceSurface } from './models';

export type SurfaceState = ReturnType<typeof createEmptySurfaceState>;

export type ToolActivity = {
  id: string;
  name: string;
  status: 'running' | 'completed';
  argsPreview: string;
  resultPreview: string;
};

export type ConversationTurn = {
  id: string;
  userText: string;
  assistantText: string;
  surfaces: RenderableCommerceSurface[];
  reasoningText: string;
  toolActivity: ToolActivity[];
};

export type PersistedConversation = {
  agentMode: DemoAgentMode;
  threadId: string;
  conversationToken: string | null;
  messages: ChatMessage[];
  surfaces: RenderableCommerceSurface[];
  latestSnapshot: Record<string, unknown> | null;
  reasoningText: string;
  toolActivity: ToolActivity[];
  completedTurns: ConversationTurn[];
};

export type ConversationViewModel = {
  draft: string;
  busy: boolean;
  status: string;
  agentMode: DemoAgentMode;
  modeLabel: string;
  threadId: string;
  historyCount: number;
  messages: ChatMessage[];
  reasoningText: string;
  toolActivity: ToolActivity[];
  surfaces: RenderableCommerceSurface[];
  latestSnapshot: Record<string, unknown> | null;
  completedTurns: ConversationTurn[];
};
