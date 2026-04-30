import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ConversationTurn, ToolActivity } from '../conversation.interfaces';
import { MarkdownPipe } from '../markdown.pipe';
import { ChatMessage, RenderableCommerceSurface } from '../models';
import { SurfaceOutletComponent } from './surface-outlet.component';

type TurnView = {
  id: string;
  userText: string;
  assistantText: string;
  surfaces: RenderableCommerceSurface[];
  reasoningText: string;
  toolActivity: ToolActivity[];
  isLive: boolean;
};

@Component({
  selector: 'app-transcript-panel',
  imports: [MarkdownPipe, SurfaceOutletComponent],
  template: `
    <header class="panel-header">
      <div>
        <p class="panel-kicker">Conversation</p>
        <h2>Conversation with inline surfaces</h2>
      </div>
      <button class="ghost-button" type="button" (click)="resetConversation.emit()">Reset</button>
    </header>

    <div class="transcript" #scrollContainer>
      @if (turns().length === 0) {
        <div class="empty-state">
          <p>No messages yet.</p>
          <span>Try “show me sofas”, “compare sofas”, or “build a living room bundle”.</span>
        </div>
      }

      @for (turn of turns(); track turn.id; let last = $last) {
        <section
          class="turn"
          [class.turn-live]="turn.isLive"
          [attr.data-turn-id]="turn.id"
        >
          @if (turn.userText) {
            <article class="bubble user-bubble">
              <p class="bubble-role">You</p>
              <p class="bubble-text">{{ turn.userText }}</p>
            </article>
          }

          @if (turn.isLive && hasProgress(turn)) {
            <details class="progress-block">
              <summary>
                <span>{{ progressLabel(turn) }}</span>
                <small>{{ turn.toolActivity.length }} steps</small>
              </summary>
              <div class="progress-content">
                @if (turn.reasoningText) {
                  <p class="progress-reasoning">{{ turn.reasoningText }}</p>
                }
                @if (turn.toolActivity.length > 0) {
                  <ul class="progress-list">
                    @for (tool of turn.toolActivity; track tool.id) {
                      <li>
                        <span>{{ formatToolName(tool.name) }}</span>
                        <small>{{ tool.status === 'running' ? 'Running' : 'Done' }}</small>
                      </li>
                    }
                  </ul>
                }
              </div>
            </details>
          }

          @if (turn.assistantText) {
            <article class="bubble assistant-bubble">
              <p class="bubble-role">Assistant</p>
              <div class="bubble-text bubble-markdown" [innerHTML]="turn.assistantText | markdown"></div>
            </article>
          }

          @if (turn.surfaces.length > 0) {
            <article class="inline-surfaces">
              <div class="surface-stack">
                @for (surface of turn.surfaces; track surface.surfaceId) {
                  <app-surface-outlet [surface]="surface" (quickAction)="quickAction.emit($event)" />
                }
              </div>
            </article>
          }
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptPanelComponent implements AfterViewChecked {
  readonly messages = input<ChatMessage[]>([]);
  readonly reasoningText = input('');
  readonly toolActivity = input<ToolActivity[]>([]);
  readonly surfaces = input<RenderableCommerceSurface[]>([]);
  readonly completedTurns = input<ConversationTurn[]>([]);
  readonly resetConversation = output<void>();
  readonly quickAction = output<string>();

  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private readonly injector = inject(Injector);
  private lastScrolledTurnId: string | null = null;

  protected readonly turns = computed<TurnView[]>(() => {
    const past: TurnView[] = this.completedTurns().map((turn) => ({
      ...turn,
      isLive: false,
    }));

    const liveMessages = this.messages();
    if (liveMessages.length === 0) {
      return past;
    }

    const userMessage = liveMessages.find((m) => m.role === 'user');
    const assistantMessage = [...liveMessages].reverse().find((m) => m.role === 'assistant');
    const liveTurn: TurnView = {
      id: userMessage?.id ?? 'live',
      userText: userMessage?.text ?? '',
      assistantText: assistantMessage?.text ?? '',
      surfaces: this.surfaces(),
      reasoningText: this.reasoningText(),
      toolActivity: this.toolActivity(),
      isLive: true,
    };

    return [...past, liveTurn];
  });

  constructor() {
    effect(() => {
      const all = this.turns();
      const live = all[all.length - 1];
      if (!live || !live.isLive || live.id === this.lastScrolledTurnId) {
        return;
      }
      this.lastScrolledTurnId = live.id;
      afterNextRender(() => this.scrollLiveTurnIntoView(live.id), { injector: this.injector });
    });
  }

  ngAfterViewChecked(): void {
    /* required for Angular to detect host changes */
  }

  protected hasProgress(turn: TurnView): boolean {
    return turn.toolActivity.length > 0 || turn.reasoningText.length > 0;
  }

  protected progressLabel(turn: TurnView): string {
    const last = turn.toolActivity[turn.toolActivity.length - 1];
    if (!last) {
      return 'Thinking';
    }
    return last.status === 'running' ? 'Working' : 'Completed';
  }

  protected formatToolName(name: string): string {
    return name.replaceAll('_', ' ');
  }

  private scrollLiveTurnIntoView(id: string): void {
    const host = this.scrollContainer()?.nativeElement;
    if (!host) return;
    const turnEl = host.querySelector<HTMLElement>(`section.turn[data-turn-id="${CSS.escape(id)}"]`);
    if (!turnEl) return;
    const offset = turnEl.offsetTop - host.offsetTop;
    const start = host.scrollTop;
    const distance = offset - start;
    if (Math.abs(distance) < 4) return;
    const duration = 320;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number): void => {
      const t = Math.min(1, (now - startTime) / duration);
      host.scrollTop = start + distance * ease(t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
