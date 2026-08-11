import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ConnectivityService } from './connectivity.service';
import { SKIP_ERROR, SKIP_LOADER } from './http/http-context';
import { OutboxService } from './outbox.service';

export interface ApiRequestOptions {
  skipLoader?: boolean;
  skipError?: boolean;
  queueIfOffline?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly outbox = inject(OutboxService);
  private readonly baseUrl = environment.apiUrl;

  get<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
    options?: ApiRequestOptions
  ): Observable<T> {
    let params = new HttpParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      params,
      context: this.buildContext(options),
    });
  }

  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.write<T>('POST', path, body, options);
  }

  /** Multipart upload — do not set Content-Type (browser sets boundary). */
  postFormData<T>(path: string, formData: FormData, options?: ApiRequestOptions): Observable<T> {
    let headers = new HttpHeaders();
    const token = this.auth.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<T>(`${this.baseUrl}${path}`, formData, {
      headers,
      context: this.buildContext(options),
    });
  }

  put<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.write<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.write<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.headers(),
      context: this.buildContext(options),
    });
  }

  private write<T>(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    body: unknown,
    options?: ApiRequestOptions
  ): Observable<T> {
    const queueIfOffline = options?.queueIfOffline ?? false;

    if (!this.connectivity.online() && queueIfOffline) {
      return from(
        this.outbox.enqueue({
          method,
          path,
          body,
          token: this.auth.token(),
        })
      ).pipe(
        switchMap(() =>
          throwError(() => ({
            queued: true,
            message: 'Guardado sin conexión. Se enviará al recuperar señal.',
          }))
        )
      );
    }

    const url = `${this.baseUrl}${path}`;
    const requestOptions = {
      headers: this.headers(),
      context: this.buildContext(options),
    };
    if (method === 'POST') return this.http.post<T>(url, body, requestOptions);
    if (method === 'PUT') return this.http.put<T>(url, body, requestOptions);
    return this.http.patch<T>(url, body, requestOptions);
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.auth.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private buildContext(options?: ApiRequestOptions): HttpContext | undefined {
    if (!options?.skipLoader && !options?.skipError) {
      return undefined;
    }

    return new HttpContext()
      .set(SKIP_LOADER, !!options?.skipLoader)
      .set(SKIP_ERROR, !!options?.skipError);
  }
}
