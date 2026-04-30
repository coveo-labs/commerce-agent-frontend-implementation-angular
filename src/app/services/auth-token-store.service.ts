import { Injectable, effect, signal } from '@angular/core';

const TOKEN_KEY = 'freedom-guide-auth-token';
const ORG_ID_KEY = 'freedom-guide-org-id';
const REGION_KEY = 'freedom-guide-region';
const TRACKING_KEY = 'freedom-guide-tracking-id';
const LANGUAGE_KEY = 'freedom-guide-language';
const COUNTRY_KEY = 'freedom-guide-country';
const CURRENCY_KEY = 'freedom-guide-currency';
const CLIENT_ID_KEY = 'freedom-guide-client-id';

export const REGION_HOSTS: Record<string, string> = {
  au: 'platform-au.cloud.coveo.com',
  na: 'platform.cloud.coveo.com',
  eu: 'platform-eu.cloud.coveo.com',
  dev: 'platformdev.cloud.coveo.com',
};

export type RequestDefaults = {
  trackingId: string;
  language: string;
  country: string;
  currency: string;
  clientId: string;
};

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  readonly token = signal<string>(this.readInitial(TOKEN_KEY));
  readonly orgId = signal<string>(this.readInitial(ORG_ID_KEY));
  readonly region = signal<string>(this.readInitial(REGION_KEY));
  readonly trackingId = signal<string>(this.readInitial(TRACKING_KEY));
  readonly language = signal<string>(this.readInitial(LANGUAGE_KEY));
  readonly country = signal<string>(this.readInitial(COUNTRY_KEY));
  readonly currency = signal<string>(this.readInitial(CURRENCY_KEY));
  readonly clientId = signal<string>(this.ensureClientId());

  constructor() {
    effect(() => this.persist(TOKEN_KEY, this.token()));
    effect(() => this.persist(ORG_ID_KEY, this.orgId()));
    effect(() => this.persist(REGION_KEY, this.region()));
    effect(() => this.persist(TRACKING_KEY, this.trackingId()));
    effect(() => this.persist(LANGUAGE_KEY, this.language()));
    effect(() => this.persist(COUNTRY_KEY, this.country()));
    effect(() => this.persist(CURRENCY_KEY, this.currency()));
    effect(() => this.persist(CLIENT_ID_KEY, this.clientId()));
  }

  setToken(value: string): void {
    this.token.set(value.trim());
  }

  clearToken(): void {
    this.token.set('');
  }

  setOrgId(value: string): void {
    this.orgId.set(value.trim());
  }

  clearOrgId(): void {
    this.orgId.set('');
  }

  setRegion(value: string): void {
    this.region.set(value.trim());
  }

  clearRegion(): void {
    this.region.set('');
  }

  setTrackingId(value: string): void {
    this.trackingId.set(value.trim());
  }

  setLanguage(value: string): void {
    this.language.set(value.trim());
  }

  setCountry(value: string): void {
    this.country.set(value.trim());
  }

  setCurrency(value: string): void {
    this.currency.set(value.trim());
  }

  setClientId(value: string): void {
    this.clientId.set(value.trim());
  }

  regenerateClientId(): void {
    this.clientId.set(this.newUuid());
  }

  authorizationHeader(): string | null {
    const value = this.token();
    if (!value) {
      return null;
    }
    return value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;
  }

  resolveEndpoint(defaultEndpoint: string): string {
    let url = defaultEndpoint;
    const host = REGION_HOSTS[this.region()];
    if (host) {
      url = url.replace(/^https?:\/\/[^/]+/, `https://${host}`);
    }
    const id = this.orgId();
    if (id) {
      url = url.replace(/\/organizations\/[^/]+\//, `/organizations/${id}/`);
    }
    return url;
  }

  resolveRequestDefaults(defaults: RequestDefaults): RequestDefaults {
    return {
      trackingId: this.trackingId() || defaults.trackingId,
      language: this.language() || defaults.language,
      country: this.country() || defaults.country,
      currency: this.currency() || defaults.currency,
      clientId: this.clientId() || defaults.clientId || this.newUuid(),
    };
  }

  private ensureClientId(): string {
    const stored = this.readInitial(CLIENT_ID_KEY);
    if (stored) {
      return stored;
    }
    return this.newUuid();
  }

  private newUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'visitor-' + Math.random().toString(36).slice(2, 14);
  }

  private persist(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  }

  private readInitial(key: string): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.localStorage.getItem(key) ?? '';
  }
}
