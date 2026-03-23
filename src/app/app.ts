import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ConversationHeaderComponent } from './components/conversation-header.component';
import {
  PersistedConversation,
  ToolActivity,
} from './conversation.interfaces';
import { RenderableCommerceSurface } from './models';
import { PromptComposerComponent } from './components/prompt-composer.component';
import { TranscriptPanelComponent } from './components/transcript-panel.component';
import { DemoConversationFacade } from './services/demo-conversation.facade';

const STORAGE_KEY = 'freedom-guide-conversation';

@Component({
  selector: 'app-root',
  imports: [
    ConversationHeaderComponent,
    TranscriptPanelComponent,
    PromptComposerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly facade = inject(DemoConversationFacade);

  constructor() {
    this.facade.hydrate(restoreConversation());

    effect(() => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.facade.persistenceSnapshot()),
      );
    });
  }
}

function restoreConversation(): PersistedConversation | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedConversation>;
    return {
      agentMode: parsed.agentMode === 'live' ? 'live' : 'mock',
      threadId:
        typeof parsed.threadId === 'string' && parsed.threadId
          ? parsed.threadId
          : crypto.randomUUID(),
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      surfaces: Array.isArray(parsed.surfaces)
        ? (parsed.surfaces as RenderableCommerceSurface[])
        : [],
      latestSnapshot:
        parsed.latestSnapshot && typeof parsed.latestSnapshot === 'object'
          ? (parsed.latestSnapshot as Record<string, unknown>)
          : null,
      reasoningText: typeof parsed.reasoningText === 'string' ? parsed.reasoningText : '',
      toolActivity: normalizeToolActivity(parsed.toolActivity),
    };
  } catch {
    return null;
  }
}

function normalizeToolActivity(value: unknown): ToolActivity[] {
  return Array.isArray(value) ? (value as ToolActivity[]) : [];
}
