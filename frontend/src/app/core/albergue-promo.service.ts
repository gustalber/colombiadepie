import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

const SHOW_DELAY_MS = 800;

@Injectable({ providedIn: 'root' })
export class AlberguePromoService {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);

  private readonly openSignal = signal(false);
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  readonly open = this.openSignal.asReadonly();

  considerShowing(path: string): void {
    this.clearPendingTimer();

    if (!this.isHomePath(path)) {
      this.openSignal.set(false);
      return;
    }

    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      this.ngZone.run(() => {
        const currentPath = this.router.url.split('?')[0];
        if (this.isHomePath(currentPath)) {
          this.openSignal.set(true);
        }
      });
    }, SHOW_DELAY_MS);
  }

  closeSnooze(): void {
    this.clearPendingTimer();
    this.openSignal.set(false);
  }

  closeAfterRegister(): void {
    this.clearPendingTimer();
    this.openSignal.set(false);
  }

  isHomePath(path: string): boolean {
    const clean = path.split('?')[0] || '/';
    return clean === '/' || clean === '';
  }

  private clearPendingTimer(): void {
    if (this.pendingTimer != null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }
}
