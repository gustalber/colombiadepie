import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const PRODUCTION_HOSTS = new Set(['colombiadepie.com', 'www.colombiadepie.com']);

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private ready = false;
  private scriptLoading: Promise<void> | null = null;

  init(): Promise<void> {
    if (!this.isActive() || this.ready) {
      return Promise.resolve();
    }

    if (window.gtag) {
      this.ready = true;
      return Promise.resolve();
    }

    if (!this.scriptLoading) {
      this.scriptLoading = this.loadGtagScript();
    }

    return this.scriptLoading;
  }

  trackPageView(url: string): void {
    if (!this.isActive()) {
      return;
    }

    const path = url.split('?')[0] || '/';
    void this.init().then(() => {
      window.gtag?.('config', environment.gaMeasurementId, {
        page_path: path,
        page_location: `${window.location.origin}${path}`,
        page_title: document.title,
      });
    });
  }

  private isActive(): boolean {
    if (!environment.gaMeasurementId) {
      return false;
    }

    if (environment.analyticsEnabled || environment.analyticsDebugLocal) {
      return true;
    }

    return PRODUCTION_HOSTS.has(window.location.hostname);
  }

  private loadGtagScript(): Promise<void> {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.gaMeasurementId}`;
      script.onload = () => {
        window.gtag?.('js', new Date());
        window.gtag?.('config', environment.gaMeasurementId, {
          send_page_view: false,
        });
        this.ready = true;
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar Google Analytics'));
      document.head.appendChild(script);
    });
  }
}
