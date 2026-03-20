// Root conversation container for the sample storefront.
// It owns transcript state, persisted conversation identity, mode switching,
// and the application of streamed AG-UI/A2UI updates into renderable UI state.
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentDemoService } from './services/agent-demo.service';
import { ChatMessage, RenderableCommerceSurface } from './models';
import { applyActivitySnapshot, createEmptySurfaceState, getRenderableSurfaces } from './a2ui-parser';
import { ProductCarouselComponent } from './components/product-carousel.component';
import { ComparisonTableComponent } from './components/comparison-table.component';
import { ComparisonSummaryComponent } from './components/comparison-summary.component';
import { BundleDisplayComponent } from './components/bundle-display.component';
import { NextActionsBarComponent } from './components/next-actions-bar.component';
import { DemoAgentMode } from './demo-agent.config';

const STORAGE_KEY = 'freedom-guide-conversation';

type PersistedConversation = {
  agentMode: DemoAgentMode;
  threadId: string;
  messages: ChatMessage[];
  surfaces: RenderableCommerceSurface[];
  latestSnapshot: Record<string, unknown> | null;
  reasoningText: string;
  toolActivity: ToolActivity[];
};

type SurfaceState = ReturnType<typeof createEmptySurfaceState>;
type ToolActivity = {
  id: string;
  name: string;
  status: 'running' | 'completed';
  argsPreview: string;
  resultPreview: string;
};

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    ProductCarouselComponent,
    ComparisonTableComponent,
    ComparisonSummaryComponent,
    BundleDisplayComponent,
    NextActionsBarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly agent = inject(AgentDemoService);
  private readonly restoredConversation = this.restoreConversation();

  protected readonly draft = signal('');
  protected readonly busy = signal(false);
  protected readonly status = signal('Ready');
  protected readonly agentMode = signal<DemoAgentMode>(
    this.restoredConversation?.agentMode ?? this.agent.getMode()
  );
  protected readonly modeLabel = computed(() =>
    this.agentMode() === 'mock'
      ? 'Mock AG-UI stream'
      : `Live via ${this.agent.getLiveTransport()}`
  );
  protected readonly latestSnapshot = signal<Record<string, unknown> | null>(
    this.restoredConversation?.latestSnapshot ?? null
  );
  protected readonly reasoningText = signal(this.restoredConversation?.reasoningText ?? '');
  protected readonly toolActivity = signal<ToolActivity[]>(
    this.restoredConversation?.toolActivity ?? []
  );
  protected readonly threadId = signal(
    this.restoredConversation?.threadId ?? this.createId()
  );
  protected readonly messages = signal<ChatMessage[]>(
    this.restoredConversation?.messages ?? []
  );
  protected readonly surfaceState = signal<SurfaceState>(
    this.createRestoredSurfaceState(this.restoredConversation?.surfaces ?? [])
  );
  protected readonly surfaces = computed(() => getRenderableSurfaces(this.surfaceState()));
  protected readonly historyCount = computed(() => this.messages().length);

  constructor() {
    effect(() => {
      if (typeof window === 'undefined') {
        return;
      }

      const payload: PersistedConversation = {
        agentMode: this.agentMode(),
        threadId: this.threadId(),
        messages: this.messages(),
        surfaces: this.surfaces(),
        latestSnapshot: this.latestSnapshot(),
        reasoningText: this.reasoningText(),
        toolActivity: this.toolActivity()
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    });

    effect(() => {
      this.agent.setMode(this.agentMode());
    });
  }

  protected async submitPrompt(prompt = this.draft().trim()): Promise<void> {
    const message = prompt.trim();
    let runFinished = false;
    let failed = false;

    if (!message || this.busy()) {
      return;
    }

    this.draft.set('');
    this.busy.set(true);
    this.status.set('Starting run');
    this.appendMessage({ id: this.createId(), role: 'user', text: message });
    this.surfaceState.set(createEmptySurfaceState());
    this.latestSnapshot.set(null);
    this.reasoningText.set('');
    this.toolActivity.set([]);

    try {
      // Transcript text and structured surfaces are updated incrementally as
      // events arrive so the UI behaves like a streaming storefront assistant.
      for await (const event of this.agent.streamTurn({
        threadId: this.threadId(),
        prompt: message
      })) {
        switch (event.type) {
          case 'RUN_STARTED':
            if (event.threadId) {
              this.threadId.set(event.threadId);
            }
            this.status.set('Run started');
            break;
          case 'RUN_FINISHED':
            runFinished = true;
            this.status.set('Ready');
            this.busy.set(false);
            break;
          case 'TEXT_MESSAGE_START':
            this.ensureAssistantMessage(event.messageId);
            break;
          case 'TEXT_MESSAGE_CONTENT':
            this.appendAssistantText(event.messageId, event.delta);
            break;
          case 'STATE_SNAPSHOT':
            this.latestSnapshot.set(event.snapshot);
            this.status.set(this.extractStatusLabel(event.snapshot) ?? 'Updating storefront');
            break;
          case 'ACTIVITY_SNAPSHOT':
            this.surfaceState.update((state) => applyActivitySnapshot(state, event.content));
            break;
          case 'TOOL_CALL_START':
            this.startToolActivity(
              event.toolCallId ?? event.toolUseId ?? this.createId(),
              event.toolName ?? event.toolCallName ?? 'tool'
            );
            this.status.set(this.describeTool(event.toolName ?? event.toolCallName ?? 'tool'));
            break;
          case 'TOOL_CALL_ARGS':
            this.updateToolActivityArgs(
              event.toolCallId ?? event.toolUseId,
              event.delta ?? event.argsDelta ?? ''
            );
            break;
          case 'TOOL_CALL_RESULT':
            this.updateToolActivityResult(event.toolCallId ?? event.toolUseId, event.content ?? '');
            break;
          case 'TOOL_CALL_END':
            this.completeToolActivity(event.toolCallId ?? event.toolUseId);
            break;
          case 'REASONING_MESSAGE_START':
            this.reasoningText.set('');
            break;
          case 'REASONING_MESSAGE_CONTENT':
            this.reasoningText.update((text) => `${text}${event.delta}`);
            break;
        }
      }
    } catch (error) {
      failed = true;
      const messageText =
        error instanceof Error ? error.message : 'The agent request failed.';
      this.appendMessage({
        id: this.createId(),
        role: 'assistant',
        text: `I could not complete that request. ${messageText}`
      });
      this.status.set('Failed');
      this.busy.set(false);
    } finally {
      if (!runFinished) {
        this.busy.set(false);
      }

      if (!runFinished && !failed) {
        this.status.set('Ready');
      }
    }
  }

  protected useQuickAction(action: string): void {
    void this.submitPrompt(action);
  }

  protected resetConversation(): void {
    this.threadId.set(this.createId());
    this.messages.set([]);
    this.surfaceState.set(createEmptySurfaceState());
    this.latestSnapshot.set(null);
    this.reasoningText.set('');
    this.toolActivity.set([]);
    this.status.set('Ready');
    this.busy.set(false);
  }

  protected toggleAgentMode(enabled: boolean): void {
    if (this.busy()) {
      return;
    }

    this.agentMode.set(enabled ? 'live' : 'mock');
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.update((messages) => [...messages, message]);
  }

  private ensureAssistantMessage(id: string): void {
    this.messages.update((messages) => {
      if (messages.some((message) => message.id === id)) {
        return messages;
      }
      return [...messages, { id, role: 'assistant', text: '' }];
    });
  }

  private appendAssistantText(id: string, text: string): void {
    this.messages.update((messages) => {
      const index = messages.findIndex((message) => message.id === id);

      if (index === -1) {
        return [...messages, { id, role: 'assistant', text }];
      }

      const nextMessages = [...messages];
      nextMessages[index] = {
        ...nextMessages[index],
        text: `${nextMessages[index].text}${text}`
      };
      return nextMessages;
    });
  }

  private createRestoredSurfaceState(surfaces: RenderableCommerceSurface[]): SurfaceState {
    const orderById = surfaces.reduce<Record<string, number>>((result, surface, index) => {
      result[surface.surfaceId] = index;
      return result;
    }, {});

    const surfacesById = surfaces.reduce<Record<string, RenderableCommerceSurface>>(
      (result, surface) => {
        result[surface.surfaceId] = surface;
        return result;
      },
      {}
    );

    return {
      orderById,
      surfacesById
    };
  }

  private startToolActivity(id: string, name: string): void {
    this.toolActivity.update((items) => [
      ...items,
      {
        id,
        name,
        status: 'running',
        argsPreview: '',
        resultPreview: ''
      }
    ]);
  }

  private updateToolActivityArgs(id: string | undefined, argsDelta: string): void {
    if (!id || !argsDelta) {
      return;
    }

    this.toolActivity.update((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              argsPreview: trimPreview(`${item.argsPreview}${argsDelta}`)
            }
          : item
      )
    );
  }

  private updateToolActivityResult(id: string | undefined, result: string): void {
    if (!id || !result) {
      return;
    }

    this.toolActivity.update((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              resultPreview: trimPreview(result)
            }
          : item
      )
    );
  }

  private completeToolActivity(id: string | undefined): void {
    if (!id) {
      return;
    }

    this.toolActivity.update((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'completed'
            }
          : item
      )
    );
  }

  private extractStatusLabel(snapshot: Record<string, unknown>): string | null {
    const directLabel = snapshot['label'];
    if (typeof directLabel === 'string' && directLabel) {
      return directLabel;
    }

    const execution = snapshot['policy_execution_state'];
    if (execution && typeof execution === 'object') {
      const currentState = (execution as Record<string, unknown>)['current_state'];
      if (typeof currentState === 'string' && currentState) {
        return currentState;
      }
    }

    return null;
  }

  private describeTool(toolName: string): string {
    const normalized = toolName.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private restoreConversation(): PersistedConversation | null {
    // Persistence keeps the demo usable across reloads and mirrors the kind of
    // client-owned storefront state an implementer may want during integration.
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
            : this.createId(),
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        surfaces: Array.isArray(parsed.surfaces)
          ? (parsed.surfaces as RenderableCommerceSurface[])
          : [],
        latestSnapshot:
          parsed.latestSnapshot && typeof parsed.latestSnapshot === 'object'
            ? (parsed.latestSnapshot as Record<string, unknown>)
            : null,
        reasoningText: typeof parsed.reasoningText === 'string' ? parsed.reasoningText : '',
        toolActivity: Array.isArray(parsed.toolActivity)
          ? (parsed.toolActivity as ToolActivity[])
          : []
      };
    } catch {
      return null;
    }
  }

  private createId(): string {
    return crypto.randomUUID();
  }
}

function trimPreview(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}
