import { Injectable, inject, signal } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConnectivityService } from './connectivity.service';
import { SKIP_ERROR, SKIP_LOADER } from './http/http-context';

export interface OutboxItem {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH';
  path: string;
  body: unknown;
  token: string | null;
  createdAt: string;
}

class OutboxDatabase extends Dexie {
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super('colombiadepie_outbox');
    this.version(1).stores({
      outbox: '++id, createdAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class OutboxService {
  private readonly db = new OutboxDatabase();
  private readonly http = inject(HttpClient);
  private readonly connectivity = inject(ConnectivityService);
  private syncing = false;

  readonly pendingCount = signal(0);

  constructor() {
    void this.refreshCount();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.flush());
    }
  }

  async enqueue(item: Omit<OutboxItem, 'id' | 'createdAt'>): Promise<void> {
    await this.db.outbox.add({
      ...item,
      createdAt: new Date().toISOString(),
    });
    await this.refreshCount();
  }

  async refreshCount(): Promise<void> {
    const count = await this.db.outbox.count();
    this.pendingCount.set(count);
  }

  async flush(): Promise<void> {
    if (this.syncing || !this.connectivity.online()) return;
    this.syncing = true;

    try {
      const items = await this.db.outbox.orderBy('id').toArray();
      for (const item of items) {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (item.token) {
          headers = headers.set('Authorization', `Bearer ${item.token}`);
        }

        const url = `${environment.apiUrl}${item.path}`;
        const context = new HttpContext()
          .set(SKIP_LOADER, true)
          .set(SKIP_ERROR, true);
        const requestOptions = { headers, context };

        if (item.method === 'POST') {
          await firstValueFrom(this.http.post(url, item.body, requestOptions));
        } else if (item.method === 'PUT') {
          await firstValueFrom(this.http.put(url, item.body, requestOptions));
        } else {
          await firstValueFrom(this.http.patch(url, item.body, requestOptions));
        }

        if (item.id != null) {
          await this.db.outbox.delete(item.id);
        }
      }
    } catch (error) {
      console.error('Outbox sync failed:', error);
    } finally {
      this.syncing = false;
      await this.refreshCount();
    }
  }
}
