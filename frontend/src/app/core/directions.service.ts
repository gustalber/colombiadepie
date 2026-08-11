import { Injectable, signal } from '@angular/core';
import { DirectionsTarget } from './utils/maps-url';

@Injectable({ providedIn: 'root' })
export class DirectionsService {
  readonly target = signal<DirectionsTarget | null>(null);

  open(target: DirectionsTarget): void {
    if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
    this.target.set({
      lat: target.lat,
      lng: target.lng,
      name: target.name?.trim() || undefined,
    });
  }

  close(): void {
    this.target.set(null);
  }
}
