import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ToolActivity } from '../conversation.interfaces';
import { ChatMessage, RenderableCommerceSurface } from '../models';
import { SurfaceOutletComponent } from './surface-outlet.component';

@Component({
  selector: 'app-transcript-panel',
  imports: [SurfaceOutletComponent],
  template: `
    <header class="panel-header">
      <div>
        <p class="panel-kicker">Conversation</p>
        <h2>Conversation with inline surfaces</h2>
      </div>
      <button class="ghost-button" type="button" (click)="resetConversation.emit()">Reset</button>
    </header>

    <div class="transcript">
      @if (messages().length === 0) {
        <div class="empty-state">
          <p>No messages yet.</p>
          <span>Try “show me sofas”, “compare sofas”, or “build a living room bundle”.</span>
        </div>
      }

      @for (message of messages(); track message.id) {
        <article
          class="bubble"
          [class.user-bubble]="message.role === 'user'"
          [class.assistant-bubble]="message.role === 'assistant'"
        >
          <p class="bubble-role">{{ message.role === 'user' ? 'You' : 'Assistant' }}</p>
          <p class="bubble-text">{{ message.text }}</p>
        </article>
      }

      @if (hasProgress()) {
        <details class="progress-block">
          <summary>
            <span>Progress</span>
            <small>{{ progressLabel() }}</small>
          </summary>

          <div class="progress-content">
            @if (reasoningText()) {
              <p class="progress-reasoning">{{ reasoningText() }}</p>
            }

            @if (toolActivity().length > 0) {
              <ul class="progress-list">
                @for (tool of toolActivity(); track tool.id) {
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

      @if (surfaces().length > 0) {
        <article class="inline-surfaces">
          <div class="inline-surfaces-head">
            <p class="bubble-role">Assistant</p>
            <span>Structured results</span>
          </div>

          <div class="surface-stack">
            @for (surface of surfaces(); track surface.surfaceId) {
              <app-surface-outlet [surface]="surface" (quickAction)="quickAction.emit($event)" />
            }
          </div>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptPanelComponent {
  readonly messages = input<ChatMessage[]>([]);
  readonly reasoningText = input('');
  readonly toolActivity = input<ToolActivity[]>([]);
  readonly surfaces = input<RenderableCommerceSurface[]>([]);
  readonly resetConversation = output<void>();
  readonly quickAction = output<string>();

  protected readonly hasProgress = computed(
    () => this.toolActivity().length > 0 || this.reasoningText().length > 0,
  );

  protected readonly progressLabel = computed(() => {
    const activity = this.toolActivity();
    return activity.length > 0
      ? activity[activity.length - 1].status === 'running'
        ? 'Working'
        : 'Completed'
      : 'Thinking';
  });

  protected formatToolName(name: string): string {
    return name.replaceAll('_', ' ');
  }
}
