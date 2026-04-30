import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatAudPrice } from '../formatting';
import { ComparisonTableSurface } from '../models';

@Component({
  selector: 'app-comparison-table',
  template: `
    <section class="surface">
      <header class="surface-header">
        <p class="surface-kicker">Comparison Table</p>
        <h3>{{ surface().heading }}</h3>
      </header>

      @if (surface().isLoading) {
        <div class="loading-table"></div>
      } @else {
        <div class="comparison-grid" [style.grid-template-columns]="gridColumns()">
          <div class="comparison-cell comparison-corner"></div>
          @for (product of surface().products; track product.ec_product_id) {
            <div class="comparison-cell comparison-head">
              @if (product.ec_image) {
                <img
                  class="comparison-image"
                  [src]="product.ec_image"
                  [alt]="product.ec_name"
                  loading="lazy"
                  decoding="async"
                />
              }
              <span class="comparison-brand">{{ product.ec_brand }}</span>
              <strong>{{ product.ec_name }}</strong>
            </div>
          }

          @for (attribute of surface().attributes; track attribute) {
            <div class="comparison-cell comparison-label">{{ formatLabel(attribute) }}</div>
            @for (product of surface().products; track product.ec_product_id) {
              <div class="comparison-cell">{{ product[attribute] || '—' }}</div>
            }
          }

          <div class="comparison-cell comparison-label">Price</div>
          @for (product of surface().products; track product.ec_product_id) {
            <div class="comparison-cell comparison-price">
              {{ formatPrice(product.ec_promo_price ?? product.ec_price) }}
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .surface-header {
        margin-bottom: 16px;
      }

      .surface-kicker {
        margin: 0 0 6px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.74rem;
        color: #516661;
      }

      h3 {
        margin: 0;
      }

      .comparison-grid {
        display: grid;
        gap: 0;
        border: 1px solid rgba(17, 35, 31, 0.1);
        border-radius: 18px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.6);
      }

      .comparison-cell {
        padding: 12px 14px;
        border-right: 1px solid rgba(17, 35, 31, 0.08);
        border-bottom: 1px solid rgba(17, 35, 31, 0.08);
        line-height: 1.45;
        font-size: 0.94rem;
      }

      .comparison-cell:last-child {
        border-right: none;
      }

      .comparison-head {
        padding: 14px;
        background: rgba(246, 242, 232, 0.85);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .comparison-image {
        width: 100%;
        max-width: 180px;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 14px;
        margin-bottom: 8px;
        background: rgba(232, 222, 209, 0.4);
      }

      .comparison-brand {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #516661;
      }

      .comparison-head strong {
        font-size: 1rem;
        line-height: 1.3;
      }

      .comparison-corner {
        background: rgba(246, 242, 232, 0.85);
      }

      .comparison-label {
        background: rgba(246, 242, 232, 0.55);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #516661;
        font-weight: 600;
      }

      .comparison-price {
        font-weight: 600;
        color: #204f46;
      }

      .loading-table {
        height: 220px;
        border-radius: 18px;
        background:
          linear-gradient(90deg, rgba(231, 221, 209, 0.95), rgba(247, 241, 232, 0.95), rgba(231, 221, 209, 0.95));
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonTableComponent {
  readonly surface = input.required<ComparisonTableSurface>();

  protected readonly gridColumns = computed(
    () => `minmax(120px, auto) repeat(${this.surface().products.length}, minmax(0, 1fr))`,
  );

  protected formatLabel(value: string): string {
    return value.replace(/_/g, ' ');
  }

  protected formatPrice(value: number): string {
    return formatAudPrice(value);
  }
}
