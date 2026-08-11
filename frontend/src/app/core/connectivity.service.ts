import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService implements OnDestroy {
  private readonly onlineSignal = signal(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  readonly online = this.onlineSignal.asReadonly();

  private readonly onOnline = () => this.onlineSignal.set(true);
  private readonly onOffline = () => this.onlineSignal.set(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
  }
}
