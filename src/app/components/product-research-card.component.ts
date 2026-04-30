import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatAudPrice } from '../formatting';
import { ProductResearchCardSurface } from '../models';

@Component({
  selector: 'app-product-research-card',
  template: `
    <section class="surface research">
      @if (surface().isLoading) {
        <div class="research-loading"></div>
      } @else {
        <div class="research-grid">
          <article class="research-product">
            @if (surface().product?.ec_image) {
              <img
                class="research-product-image"
                [src]="surface().product?.ec_image"
                [alt]="surface().product?.ec_name"
                loading="lazy"
                decoding="async"
              />
            }
            <div class="research-product-meta">
              <strong>{{ surface().product?.ec_name }}</strong>
              <span class="price">{{ formattedPrice() }}</span>
            </div>
          </article>

          <article class="research-content">
            <section class="research-summary-card">
              <header class="research-summary-header">
                <div class="research-icon" aria-hidden="true">✦</div>
                <div class="research-summary-meta">
                  <h4>AI-Generated Summary</h4>
                  <p>Generated based on product specs</p>
                </div>
              </header>
              <p class="research-summary-text">{{ surface().summary }}</p>
            </section>

            @if (surface().bullets.length > 0) {
              <h5>Key Features</h5>
              <ul class="research-bullets">
                @for (bullet of surface().bullets; track bullet) {
                  <li>{{ bullet }}</li>
                }
              </ul>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .research {
        padding: 0;
      }

      .research-grid {
        display: grid;
        grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
        gap: 28px;
        align-items: start;
      }

      @media (max-width: 720px) {
        .research-grid {
          grid-template-columns: 1fr;
        }
      }

      .research-product {
        border: 1px solid rgba(17, 35, 31, 0.1);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.92);
        padding: 14px;
      }

      .research-product-image {
        display: block;
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 14px;
        margin-bottom: 12px;
        background: rgba(232, 222, 209, 0.4);
      }

      .research-product-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .research-product-meta strong {
        font-size: 1rem;
        line-height: 1.3;
      }

      .research-product-meta .price {
        color: #204f46;
        font-weight: 600;
      }

      .research-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .research-summary-card {
        padding: 18px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(32, 79, 70, 0.08), rgba(215, 239, 231, 0.45));
        border: 1px solid rgba(32, 79, 70, 0.18);
      }

      .research-summary-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
      }

      .research-icon {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: linear-gradient(135deg, #204f46, #2f7363);
        color: white;
        font-size: 1.4rem;
        line-height: 1;
      }

      .research-summary-meta h4 {
        margin: 0 0 2px;
        font-size: 1rem;
        color: #11231f;
      }

      .research-summary-meta p {
        margin: 0;
        font-size: 0.85rem;
        color: #516661;
      }

      .research-summary-text {
        margin: 0;
        line-height: 1.6;
        color: #11231f;
      }

      h5 {
        margin: 8px 0 0;
        padding: 0 18px;
        font-size: 1rem;
      }

      .research-bullets {
        margin: 0;
        padding: 0 0 0 38px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        list-style: none;
      }

      .research-bullets li {
        position: relative;
        line-height: 1.5;
      }

      .research-bullets li::before {
        content: '';
        position: absolute;
        left: -18px;
        top: 0.55em;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #204f46;
      }

      .research-loading {
        height: 240px;
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
export class ProductResearchCardComponent {
  readonly surface = input.required<ProductResearchCardSurface>();

  protected formattedPrice(): string {
    const product = this.surface().product;
    if (!product) {
      return '';
    }
    return formatAudPrice(product.ec_promo_price ?? product.ec_price);
  }
}
