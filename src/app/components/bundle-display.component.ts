import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatAudPrice } from '../formatting';
import { BundleDisplaySurface, BundleDisplayTier } from '../models';

@Component({
  selector: 'app-bundle-display',
  template: `
    <section class="surface">
      <header class="surface-header">
        <p class="surface-kicker">Bundle Display</p>
        <h3>{{ surface().title }}</h3>
      </header>

      @if (surface().isLoading) {
        <div class="loading-grid">
          @for (item of placeholders; track $index) {
            <div class="loading-card"></div>
          }
        </div>
      } @else {
        @for (bundle of surface().bundles; track bundle.bundleId) {
          <article class="bundle-card">
            <div class="bundle-head">
              <h4>{{ bundle.label }}</h4>
              <p>{{ bundle.description }}</p>
            </div>

            <div class="slot-grid">
              @for (slot of bundle.slots; track slot.surfaceRef + ':' + slot.categoryLabel) {
                <div class="slot">
                  @if (slot.product?.ec_image) {
                    <img
                      class="slot-image"
                      [src]="slot.product?.ec_image"
                      [alt]="slot.product?.ec_name"
                      loading="lazy"
                      decoding="async"
                    />
                  }
                  <span class="slot-label">{{ slot.categoryLabel }}</span>
                  <strong>{{ slot.product?.ec_name || 'Pending selection' }}</strong>
                  <small>{{ slot.product?.ec_brand || 'Freedom' }}</small>
                  @if (slotPrice(slot.product) !== null) {
                    <span class="slot-price">{{ formatPrice(slotPrice(slot.product)!) }}</span>
                  }
                  @if (slot.product?.description) {
                    <p>{{ slot.product?.description }}</p>
                  }
                </div>
              }
            </div>

            <footer class="bundle-total">
              <span class="bundle-total-label">Bundle total</span>
              <strong class="bundle-total-value">{{ formatPrice(bundleTotal(bundle)) }}</strong>
            </footer>
          </article>
        }
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

      h3,
      h4,
      p {
        margin: 0;
      }

      .bundle-card,
      .loading-card {
        border: 1px solid rgba(17, 35, 31, 0.12);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.78);
        padding: 16px;
      }

      .loading-grid {
        display: grid;
        gap: 14px;
      }

      .loading-card {
        min-height: 180px;
        background:
          linear-gradient(90deg, rgba(231, 221, 209, 0.95), rgba(247, 241, 232, 0.95), rgba(231, 221, 209, 0.95));
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      .bundle-head p {
        margin-top: 8px;
        color: #516661;
        line-height: 1.5;
      }

      .slot-grid {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .slot {
        padding: 12px;
        border-radius: 16px;
        background: rgba(246, 242, 232, 0.9);
        border: 1px solid rgba(17, 35, 31, 0.06);
      }

      .slot-image {
        display: block;
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border-radius: 12px;
        margin-bottom: 10px;
        background: rgba(232, 222, 209, 0.4);
      }

      .slot-grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      }

      .slot-label {
        display: block;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.72rem;
        color: #516661;
      }

      .slot small {
        display: block;
        margin-top: 6px;
        color: #516661;
      }

      .slot p {
        margin: 8px 0 0;
        color: #516661;
        line-height: 1.45;
        font-size: 0.92rem;
      }

      .slot-price {
        display: block;
        margin-top: 8px;
        color: #204f46;
        font-weight: 600;
        font-size: 1rem;
      }

      .bundle-total {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
        padding: 14px 18px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(32, 79, 70, 0.1), rgba(215, 239, 231, 0.55));
        border: 1px solid rgba(32, 79, 70, 0.18);
      }

      .bundle-total-label {
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.78rem;
        color: #516661;
      }

      .bundle-total-value {
        font-size: 1.4rem;
        color: #11231f;
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
export class BundleDisplayComponent {
  protected readonly placeholders = Array.from({ length: 1 });
  readonly surface = input.required<BundleDisplaySurface>();

  protected slotPrice(product: { ec_promo_price?: number; ec_price?: number } | null | undefined): number | null {
    if (!product) {
      return null;
    }
    const value = product.ec_promo_price ?? product.ec_price;
    return typeof value === 'number' && value > 0 ? value : null;
  }

  protected bundleTotal(bundle: BundleDisplayTier): number {
    return bundle.slots.reduce((sum, slot) => sum + (this.slotPrice(slot.product) ?? 0), 0);
  }

  protected formatPrice(value: number): string {
    return formatAudPrice(value);
  }
}
