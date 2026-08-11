import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { mapApiError } from './api-error.mapper';
import { AlertService } from './alert.service';
import { SKIP_ERROR, SKIP_LOADER } from './http-context';
import { LoadingService } from './loading.service';

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl);
}

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  const alert = inject(AlertService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const skipLoader = req.context.get(SKIP_LOADER);
  const skipError = req.context.get(SKIP_ERROR);

  if (!skipLoader) {
    loading.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoader) {
        loading.hide();
      }
    }),
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      if (!skipError) {
        const mapped = mapApiError(err);
        alert.showError(mapped.title, mapped.message);

        if (err.status === 401 && auth.isLoggedIn()) {
          auth.clearSession();
          void router.navigate(['/login']);
        }
      }

      return throwError(() => err);
    })
  );
};
