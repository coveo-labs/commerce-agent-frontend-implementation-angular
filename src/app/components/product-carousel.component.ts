import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { formatAudPrice } from '../formatting';
import { ProductCarouselSurface } from '../models';

@Component({
  selector: 'app-product-carousel',
  template: `
    <section class="surface">
      <header class="surface-header">
        <div>
          <p class="surface-kicker">Product Carousel</p>
          <h3>{{ surface().heading }}</h3>
        </div>
        @if (!surface().isLoading && surface().products.length > 0) {
          <div class="carousel-controls">
            <span class="carousel-count">{{ surface().products.length }} results</span>
            <button
              type="button"
              class="carousel-arrow"
              aria-label="Scroll previous"
              (click)="scrollBy(-1)"
            >‹</button>
            <button
              type="button"
              class="carousel-arrow"
              aria-label="Scroll next"
              (click)="scrollBy(1)"
            >›</button>
          </div>
        }
      </header>

      @if (surface().isLoading) {
        <div class="loading-grid">
          @for (item of placeholders; track $index) {
            <div class="loading-card"></div>
          }
        </div>
      } @else {
        <div
          class="grid"
          #grid
          [style.grid-template-rows]="rowsTemplate()"
        >
          @for (item of surface().products; track item.ec_product_id) {
            <article class="card">
              @if (item.ec_image) {
                <img
                  class="product-image"
                  [src]="item.ec_image"
                  [alt]="item.ec_name"
                  loading="lazy"
                  decoding="async"
                  (error)="onImageError($any($event))"
                />
              } @else {
                <div
                  class="swatch"
                  [style.background]="item.accent || 'linear-gradient(135deg, #e7d8c8, #c6a889)'"
                ></div>
              }
              <p class="brand">{{ item.ec_brand }}</p>
              <h4>{{ item.ec_name }}</h4>
              <div class="footer">
                <strong>{{ formatPrice(item.ec_promo_price ?? item.ec_price) }}</strong>
                <span>{{ item.ec_promo_price ? 'Sale price' : 'View details' }}</span>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .surface-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .surface-kicker,
      .brand {
        margin: 0 0 6px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.74rem;
        color: #516661;
      }

      h3,
      h4 {
        margin: 0;
      }

      .carousel-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .carousel-count {
        font-size: 0.78rem;
        color: #516661;
        margin-right: 4px;
      }

      .carousel-arrow {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid rgba(17, 35, 31, 0.12);
        background: rgba(255, 255, 255, 0.85);
        color: #204f46;
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
        transition: background 160ms ease, transform 160ms ease;
      }

      .carousel-arrow:hover {
        background: rgba(215, 239, 231, 0.9);
        transform: scale(1.05);
      }

      .grid {
        --carousel-gap: 16px;
        --carousel-columns: 4;
        --carousel-min-card: 240px;
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: max(
          var(--carousel-min-card),
          calc(
            (100% - (var(--carousel-columns) - 1) * var(--carousel-gap)) /
              var(--carousel-columns)
          )
        );
        gap: var(--carousel-gap);
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        scroll-behavior: smooth;
        padding-bottom: 4px;
      }

      .grid::-webkit-scrollbar {
        height: 6px;
      }

      .grid::-webkit-scrollbar-thumb {
        background: rgba(17, 35, 31, 0.18);
        border-radius: 3px;
      }

      .loading-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 14px;
      }

      .product-image {
        display: block;
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 16px;
        margin-bottom: 12px;
        background: rgba(232, 222, 209, 0.4);
      }

      .product-image[data-broken='true'] {
        display: none;
      }

      .card,
      .loading-card {
        border-radius: 22px;
        padding: 14px;
        border: 1px solid rgba(17, 35, 31, 0.12);
        background: rgba(255, 255, 255, 0.85);
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
      }

      .loading-card {
        min-height: 220px;
        background:
          linear-gradient(90deg, rgba(231, 221, 209, 0.95), rgba(247, 241, 232, 0.95), rgba(231, 221, 209, 0.95));
        background-size: 200% 100%;
        animation: shimmer 1.25s linear infinite;
      }

      .swatch {
        width: 100%;
        height: 140px;
        border-radius: 16px;
        margin-bottom: 12px;
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: auto;
        padding-top: 8px;
      }

      .footer span {
        color: #204f46;
        font-size: 0.82rem;
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
export class ProductCarouselComponent {
  protected readonly placeholders = Array.from({ length: 4 });
  readonly surface = input.required<ProductCarouselSurface>();

  protected readonly rowsTemplate = computed(() =>
    this.surface().products.length >= 8 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
  );

  private readonly grid = viewChild<ElementRef<HTMLDivElement>>('grid');

  protected formatPrice(value: number): string {
    return formatAudPrice(value);
  }

  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.dataset['broken'] = 'true';
  }

  protected scrollBy(direction: 1 | -1): void {
    const el = this.grid()?.nativeElement;
    if (!el) {
      return;
    }
    const distance = Math.max(el.clientWidth - 80, 240);
    el.scrollBy({ left: distance * direction, behavior: 'smooth' });
  }
}
