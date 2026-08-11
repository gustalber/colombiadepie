import { HttpContextToken } from '@angular/common/http';

/** Omite el overlay global de carga (p. ej. sincronización en segundo plano). */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

/** Omite el modal global de error (p. ej. login con mensaje inline). */
export const SKIP_ERROR = new HttpContextToken<boolean>(() => false);
