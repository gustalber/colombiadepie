import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AlertService {
  readonly visible = signal(false);
  readonly title = signal('Error');
  readonly message = signal('No pudimos completar la operación.');

  showError(title: string, message: string): void {
    this.title.set(title);
    this.message.set(message);
    this.visible.set(true);
  }

  dismiss(): void {
    this.visible.set(false);
  }
}
