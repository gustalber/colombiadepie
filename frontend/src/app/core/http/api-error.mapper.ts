import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorView {
  title: string;
  message: string;
}

/** Mensajes genéricos — no expone detalle del backend. */
export function mapApiError(err: HttpErrorResponse): ApiErrorView {
  if (err.status === 0) {
    return {
      title: 'Sin conexión',
      message:
        'No pudimos conectar con el servidor. Revisa tu internet e inténtalo de nuevo.',
    };
  }

  if (err.status === 401) {
    return {
      title: 'Sesión expirada',
      message: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
    };
  }

  if (err.status === 403) {
    return {
      title: 'Acceso denegado',
      message: 'No tienes permiso para realizar esta acción.',
    };
  }

  if (err.status === 404) {
    return {
      title: 'No encontrado',
      message: 'No encontramos lo que buscabas.',
    };
  }

  if (err.status === 409) {
    return {
      title: 'No se pudo guardar',
      message: 'Esta acción entra en conflicto con datos existentes.',
    };
  }

  if (err.status >= 500) {
    return {
      title: 'Error del servidor',
      message: 'Algo salió mal en nuestros servidores. Inténtalo más tarde.',
    };
  }

  return {
    title: 'Error',
    message: 'No pudimos completar la operación. Inténtalo de nuevo.',
  };
}
