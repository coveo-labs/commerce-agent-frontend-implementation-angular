import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { demoAgentConfig } from '../demo-agent.config';
import { AuthTokenStore } from '../services/auth-token-store.service';

const FREEDOM_ORG_ID = 'freedomfurnitureproduction1s4nmz28u';

@Component({
  selector: 'app-auth-token-input',
  template: `
    <details class="panel auth-token" [open]="!hasToken()">
      <summary class="auth-token-summary">
        <div class="auth-token-summary-text">
          <p class="eyebrow">Live connection</p>
          <p class="auth-token-help">
            Paste a Bearer token from Freedom's site and the Coveo organization ID. Both are stored
            locally in your browser. Use the <strong>Freedom</strong> shortcut to fill in the
            production org.
          </p>
        </div>
        <span class="auth-token-status" [class.is-set]="hasToken()">
          {{ hasToken() ? 'Token set · ' + maskedPreview() : 'No token set' }}
        </span>
        <span class="auth-token-chevron" aria-hidden="true">▾</span>
      </summary>

      <label class="auth-token-field">
        <span class="auth-token-label">Bearer token</span>
        <div class="auth-token-row">
          <input
            #tokenField
            class="auth-token-input"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="Paste your token here…"
            [value]="rawToken()"
            (input)="onTokenInput(tokenField.value)"
          />
          <button
            type="button"
            class="ghost-button"
            [disabled]="!hasToken()"
            (click)="clearToken(); tokenField.value = ''"
          >
            Clear
          </button>
        </div>
      </label>

      <label class="auth-token-field">
        <span class="auth-token-label">
          Organization ID
          <span class="auth-token-default">default: {{ defaultOrgId }}</span>
        </span>
        <div class="auth-token-row">
          <input
            #orgField
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="e.g. freedomfurnitureproduction1s4nmz28u"
            [value]="orgId()"
            (input)="onOrgIdInput(orgField.value)"
          />
          <select
            #regionField
            class="auth-token-input auth-token-select"
            [value]="region()"
            (change)="onRegionChange(regionField.value)"
          >
            <option value="">Default region</option>
            <option value="au">AU</option>
            <option value="na">NA</option>
            <option value="eu">EU</option>
            <option value="dev">Dev</option>
          </select>
          <button
            type="button"
            class="ghost-button"
            (click)="setFreedomPreset(); orgField.value = freedomOrgId; regionField.value = 'au'"
          >
            Freedom
          </button>
          <button
            type="button"
            class="ghost-button"
            [disabled]="!hasOrgIdOverride() && !hasRegionOverride()"
            (click)="clearOverrides(); orgField.value = ''; regionField.value = ''"
          >
            Reset
          </button>
        </div>
        <p class="auth-token-resolved">Resolved endpoint: <code>{{ resolvedEndpoint() }}</code></p>
      </label>

      <label class="auth-token-field">
        <span class="auth-token-label">
          Tracking ID
          <span class="auth-token-default">default: {{ defaults.trackingId }}</span>
        </span>
        <div class="auth-token-row">
          <input
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            [placeholder]="defaults.trackingId"
            [value]="trackingId()"
            (input)="onTrackingIdInput($any($event.target).value)"
          />
        </div>
      </label>

      <div class="auth-token-grid">
        <label class="auth-token-field">
          <span class="auth-token-label">
            Language
            <span class="auth-token-default">{{ defaults.language }}</span>
          </span>
          <input
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            [placeholder]="defaults.language"
            [value]="language()"
            (input)="onLanguageInput($any($event.target).value)"
          />
        </label>
        <label class="auth-token-field">
          <span class="auth-token-label">
            Country
            <span class="auth-token-default">{{ defaults.country }}</span>
          </span>
          <input
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            [placeholder]="defaults.country"
            [value]="country()"
            (input)="onCountryInput($any($event.target).value)"
          />
        </label>
        <label class="auth-token-field">
          <span class="auth-token-label">
            Currency
            <span class="auth-token-default">{{ defaults.currency }}</span>
          </span>
          <input
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            [placeholder]="defaults.currency"
            [value]="currency()"
            (input)="onCurrencyInput($any($event.target).value)"
          />
        </label>
      </div>

      <label class="auth-token-field">
        <span class="auth-token-label">
          Client ID (visitor)
          <span class="auth-token-default">auto-generated UUID, persisted</span>
        </span>
        <div class="auth-token-row">
          <input
            class="auth-token-input auth-token-input--text"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="visitor uuid"
            [value]="clientId()"
            (input)="onClientIdInput($any($event.target).value)"
          />
          <button type="button" class="ghost-button" (click)="regenerateClientId()">
            New
          </button>
        </div>
      </label>
    </details>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthTokenInputComponent {
  private readonly store = inject(AuthTokenStore);

  readonly rawToken = this.store.token;
  readonly orgId = this.store.orgId;
  readonly region = this.store.region;
  readonly trackingId = this.store.trackingId;
  readonly language = this.store.language;
  readonly country = this.store.country;
  readonly currency = this.store.currency;
  readonly clientId = this.store.clientId;
  readonly defaults = demoAgentConfig.liveRequestDefaults;
  readonly hasToken = computed(() => this.rawToken().length > 0);
  readonly hasOrgIdOverride = computed(() => this.orgId().length > 0);
  readonly hasRegionOverride = computed(() => this.region().length > 0);
  readonly maskedPreview = computed(() => {
    const value = this.rawToken();
    return value ? `••••${value.slice(-4)}` : '';
  });
  readonly resolvedEndpoint = computed(() =>
    this.store.resolveEndpoint(demoAgentConfig.liveEndpoint),
  );

  readonly defaultOrgId = extractOrgId(demoAgentConfig.liveEndpoint);
  readonly freedomOrgId = FREEDOM_ORG_ID;

  onTokenInput(value: string): void {
    this.store.setToken(value);
  }

  clearToken(): void {
    this.store.clearToken();
  }

  onOrgIdInput(value: string): void {
    this.store.setOrgId(value);
  }

  onRegionChange(value: string): void {
    this.store.setRegion(value);
  }

  clearOverrides(): void {
    this.store.clearOrgId();
    this.store.clearRegion();
  }

  setFreedomPreset(): void {
    this.store.setOrgId(FREEDOM_ORG_ID);
    this.store.setRegion('au');
  }

  onTrackingIdInput(value: string): void {
    this.store.setTrackingId(value);
  }

  onLanguageInput(value: string): void {
    this.store.setLanguage(value);
  }

  onCountryInput(value: string): void {
    this.store.setCountry(value);
  }

  onCurrencyInput(value: string): void {
    this.store.setCurrency(value);
  }

  onClientIdInput(value: string): void {
    this.store.setClientId(value);
  }

  regenerateClientId(): void {
    this.store.regenerateClientId();
  }
}

function extractOrgId(endpoint: string): string {
  const match = endpoint.match(/\/organizations\/([^/]+)\//);
  return match ? match[1] : '';
}
