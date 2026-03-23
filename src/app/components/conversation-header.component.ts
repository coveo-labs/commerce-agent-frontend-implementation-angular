import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DemoAgentMode } from '../demo-agent.config';

@Component({
  selector: 'app-conversation-header',
  template: `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Freedom furniture reference app</p>
        <h1>Structured commerce surfaces for a furniture storefront.</h1>
        <p class="lede">
          This demo focuses on storefront-side responsibilities: stable conversation identity,
          streamed assistant text, and renderable A2UI surfaces for shopping flows.
        </p>
      </div>

      <div class="hero-meta">
        <div class="meta-card">
          <span>Mode</span>
          <strong>{{ modeLabel() }}</strong>
        </div>
        <div class="meta-card">
          <span>Thread</span>
          <strong>{{ threadId().slice(0, 8) }}</strong>
        </div>
        <div class="meta-card">
          <span>Status</span>
          <strong>{{ status() }}</strong>
        </div>
        <div class="meta-card">
          <span>Messages</span>
          <strong>{{ historyCount() }}</strong>
        </div>
        <label class="meta-card mode-toggle-card">
          <span>Use live path</span>
          <div class="toggle-row">
            <strong>{{ agentMode() === 'live' ? 'Live' : 'Mock' }}</strong>
            <input
              #modeToggle
              class="toggle-input"
              type="checkbox"
              [checked]="agentMode() === 'live'"
              [disabled]="busy()"
              (change)="agentModeChange.emit(modeToggle.checked)"
            />
          </div>
        </label>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationHeaderComponent {
  readonly modeLabel = input.required<string>();
  readonly threadId = input.required<string>();
  readonly status = input.required<string>();
  readonly historyCount = input.required<number>();
  readonly agentMode = input.required<DemoAgentMode>();
  readonly busy = input(false);
  readonly agentModeChange = output<boolean>();
}
