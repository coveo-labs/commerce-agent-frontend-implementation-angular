import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-comparison-summary',
  imports: [CommonModule],
  template: `
    <section class="surface summary">
      <div class="summary-lead">
        <p class="surface-kicker">Comparison Summary</p>
        <span>Assistant recommendation</span>
      </div>
      <p class="summary-text">{{ text }}</p>
    </section>
  `,
  styles: [
    `
      .summary {
        border: 1px solid rgba(17, 35, 31, 0.12);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.72);
        padding: 18px;
      }

      .summary-lead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .surface-kicker {
        margin: 0 0 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.74rem;
        color: #516661;
      }

      .summary-lead span {
        font-size: 0.8rem;
        color: #516661;
      }

      .summary-text {
        margin: 0;
        line-height: 1.6;
        color: #204f46;
        font-size: 1rem;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComparisonSummaryComponent {
  @Input({ required: true }) text = '';
}
