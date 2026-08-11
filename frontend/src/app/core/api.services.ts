import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, ApiRequestOptions } from './api-client.service';
import {
  Afectado,
  AfectadoIntegrante,
  AuthResponse,
  CensoReporte,
  DataResponse,
  Emparejamiento,
  ListResponse,
  Necesidad,
  Oferta,
  OfertaItem,
  PuntoDemanda,
  Usuario,
} from './models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiClient);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api
      .post<DataResponse<AuthResponse>>('/auth/login', { email, password }, { skipError: true })
      .pipe(map((res) => res.data));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.api
      .post<DataResponse<{ ok: boolean }>>('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .pipe(map(() => undefined));
  }
}

@Injectable({ providedIn: 'root' })
export class PuntosApiService {
  private readonly api = inject(ApiClient);

  list(
    filters?: {
      municipio?: string;
      estado?: string;
    },
    options?: ApiRequestOptions
  ): Observable<ListResponse<PuntoDemanda>> {
    return this.api.get<ListResponse<PuntoDemanda>>('/puntos', filters, options);
  }

  getById(id: string): Observable<PuntoDemanda> {
    return this.api
      .get<DataResponse<PuntoDemanda>>(`/puntos/${id}`)
      .pipe(map((res) => res.data));
  }

  create(body: Partial<PuntoDemanda>): Observable<PuntoDemanda> {
    return this.api
      .post<DataResponse<PuntoDemanda>>('/puntos', body, { queueIfOffline: true })
      .pipe(map((res) => res.data));
  }

  update(id: string, body: Partial<PuntoDemanda>): Observable<PuntoDemanda> {
    return this.api
      .patch<DataResponse<PuntoDemanda>>(`/puntos/${id}`, body, {
        queueIfOffline: true,
      })
      .pipe(map((res) => res.data));
  }

  verify(id: string): Observable<PuntoDemanda> {
    return this.api
      .patch<DataResponse<PuntoDemanda>>(`/puntos/${id}/verificar`, {})
      .pipe(map((res) => res.data));
  }
}

@Injectable({ providedIn: 'root' })
export class NecesidadesApiService {
  private readonly api = inject(ApiClient);

  listOpen(
    filters?: {
      municipio?: string;
      categoria?: string;
      estado?: string;
    },
    options?: ApiRequestOptions
  ): Observable<ListResponse<Necesidad>> {
    return this.api.get<ListResponse<Necesidad>>('/necesidades', filters, options);
  }

  listByPunto(puntoId: string): Observable<ListResponse<Necesidad>> {
    return this.api.get<ListResponse<Necesidad>>(
      `/puntos/${puntoId}/necesidades`
    );
  }

  create(puntoId: string, body: Partial<Necesidad>): Observable<Necesidad> {
    return this.api
      .post<DataResponse<Necesidad>>(`/puntos/${puntoId}/necesidades`, body, {
        queueIfOffline: true,
      })
      .pipe(map((res) => res.data));
  }

  getByPunto(puntoId: string, id: string): Observable<Necesidad> {
    return this.api
      .get<DataResponse<Necesidad>>(`/puntos/${puntoId}/necesidades/${id}`)
      .pipe(map((res) => res.data));
  }

  update(
    puntoId: string,
    id: string,
    body: Partial<Necesidad>
  ): Observable<Necesidad> {
    return this.api
      .patch<DataResponse<Necesidad>>(
        `/puntos/${puntoId}/necesidades/${id}`,
        body,
        { queueIfOffline: true }
      )
      .pipe(map((res) => res.data));
  }

  remove(puntoId: string, id: string): Observable<void> {
    return this.api.delete<void>(`/puntos/${puntoId}/necesidades/${id}`);
  }

  updateEstado(
    puntoId: string,
    id: string,
    estado: string
  ): Observable<Necesidad> {
    return this.api
      .patch<DataResponse<Necesidad>>(
        `/puntos/${puntoId}/necesidades/${id}/estado`,
        { estado }
      )
      .pipe(map((res) => res.data));
  }

  verify(id: string): Observable<Necesidad> {
    return this.api
      .patch<DataResponse<Necesidad>>(`/necesidades/${id}/verificar`, {})
      .pipe(map((res) => res.data));
  }
}

@Injectable({ providedIn: 'root' })
export class OfertasApiService {
  private readonly api = inject(ApiClient);

  createPublic(
    body: Omit<Partial<Oferta>, 'items'> & {
      items: Array<
        Pick<OfertaItem, 'categoria'> &
          Partial<Pick<OfertaItem, 'cantidad' | 'unidad' | 'descripcion'>>
      >;
    }
  ): Observable<Oferta> {
    return this.api
      .post<DataResponse<Oferta>>('/ofertas', body)
      .pipe(map((res) => res.data));
  }

  list(filters?: {
    categoria?: string;
    estado?: string;
  }): Observable<ListResponse<Oferta>> {
    return this.api.get<ListResponse<Oferta>>('/ofertas', filters);
  }
}

@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  private readonly api = inject(ApiClient);

  createResponsable(body: {
    nombre: string;
    email: string;
    punto_id: string;
  }): Observable<Usuario> {
    return this.api
      .post<DataResponse<Usuario>>('/usuarios', body)
      .pipe(map((res) => res.data));
  }

  listByPunto(puntoId: string): Observable<ListResponse<Usuario>> {
    return this.api.get<ListResponse<Usuario>>(`/usuarios/por-punto/${puntoId}`);
  }

  resetPassword(userId: string): Observable<Usuario> {
    return this.api
      .post<DataResponse<Usuario>>(`/usuarios/${userId}/reset-password`, {})
      .pipe(map((res) => res.data));
  }
}

@Injectable({ providedIn: 'root' })
export class EmparejamientosApiService {
  private readonly api = inject(ApiClient);

  list(filters?: {
    estado?: string;
    punto_id?: string;
  }): Observable<ListResponse<Emparejamiento>> {
    return this.api.get<ListResponse<Emparejamiento>>('/emparejamientos', filters);
  }

  create(body: {
    necesidad_id: string;
    oferta_item_id: string;
    estado?: string;
  }): Observable<Emparejamiento> {
    return this.api
      .post<DataResponse<Emparejamiento>>('/emparejamientos', body)
      .pipe(map((res) => res.data));
  }

  updateEstado(id: string, estado: string): Observable<Emparejamiento> {
    return this.api
      .patch<DataResponse<Emparejamiento>>(`/emparejamientos/${id}/estado`, {
        estado,
      })
      .pipe(map((res) => res.data));
  }

  confirmDelivery(id: string): Observable<Emparejamiento> {
    return this.updateEstado(id, 'entregado');
  }
}

@Injectable({ providedIn: 'root' })
export class AfectadosApiService {
  private readonly api = inject(ApiClient);

  listByPunto(
    puntoId: string,
    filters?: {
      municipio?: string;
      situacion_actual?: string;
      estado_registro?: string;
      en_albergue?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Observable<ListResponse<Afectado>> {
    const query: Record<string, string | number | undefined> = {
      municipio: filters?.municipio,
      situacion_actual: filters?.situacion_actual,
      estado_registro: filters?.estado_registro,
      limit: filters?.limit,
      offset: filters?.offset,
    };
    if (filters?.en_albergue !== undefined) {
      query['en_albergue'] = String(filters.en_albergue);
    }
    return this.api.get<ListResponse<Afectado>>(
      `/puntos/${puntoId}/afectados`,
      query
    );
  }

  listCoord(filters?: {
    municipio?: string;
    situacion_actual?: string;
    estado_registro?: string;
    punto_id?: string;
    en_albergue?: boolean;
  }): Observable<ListResponse<Afectado>> {
    const query: Record<string, string | undefined> = {
      municipio: filters?.municipio,
      situacion_actual: filters?.situacion_actual,
      estado_registro: filters?.estado_registro,
      punto_id: filters?.punto_id,
    };
    if (filters?.en_albergue !== undefined) {
      query['en_albergue'] = String(filters.en_albergue);
    }
    return this.api.get<ListResponse<Afectado>>('/afectados', query);
  }

  getByPunto(puntoId: string, id: string): Observable<Afectado> {
    return this.api
      .get<DataResponse<Afectado>>(`/puntos/${puntoId}/afectados/${id}`)
      .pipe(map((res) => res.data));
  }

  create(puntoId: string, body: Partial<Afectado> & { integrantes?: AfectadoIntegrante[] }): Observable<Afectado> {
    return this.api
      .post<DataResponse<Afectado>>(`/puntos/${puntoId}/afectados`, body, {
        queueIfOffline: true,
      })
      .pipe(map((res) => res.data));
  }

  update(
    puntoId: string,
    id: string,
    body: Partial<Afectado> & { integrantes?: AfectadoIntegrante[] }
  ): Observable<Afectado> {
    return this.api
      .patch<DataResponse<Afectado>>(`/puntos/${puntoId}/afectados/${id}`, body, {
        queueIfOffline: true,
      })
      .pipe(map((res) => res.data));
  }

  remove(puntoId: string, id: string): Observable<void> {
    return this.api.delete<void>(`/puntos/${puntoId}/afectados/${id}`);
  }

  getReporte(filters?: {
    municipio?: string;
    punto_id?: string;
    estado_registro?: string;
  }): Observable<CensoReporte> {
    return this.api
      .get<DataResponse<CensoReporte>>('/afectados/reporte', filters)
      .pipe(map((res) => res.data));
  }

  getReporteByPunto(
    puntoId: string,
    filters?: { municipio?: string; estado_registro?: string }
  ): Observable<CensoReporte> {
    return this.api
      .get<DataResponse<CensoReporte>>(`/puntos/${puntoId}/afectados/reporte`, filters)
      .pipe(map((res) => res.data));
  }
}
