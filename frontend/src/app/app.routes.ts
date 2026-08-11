import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/ayudar/ayudar-page.component').then((m) => m.AyudarPageComponent),
  },
  {
    path: 'mapa',
    loadComponent: () =>
      import('./features/mapa/mapa-page.component').then((m) => m.MapaPageComponent),
  },
  {
    path: 'ayuda-humanitaria',
    loadComponent: () =>
      import('./features/seo/ayuda-humanitaria-page.component').then(
        (m) => m.AyudaHumanitariaPageComponent
      ),
  },
  {
    path: 'albergues/:municipio',
    loadComponent: () =>
      import('./features/seo/albergues-municipio-page.component').then(
        (m) => m.AlberguesMunicipioPageComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'cuenta/contrasena',
    loadComponent: () =>
      import('./features/cuenta/change-password-page.component').then(
        (m) => m.ChangePasswordPageComponent
      ),
  },
  {
    path: 'ayudar/registrar',
    loadComponent: () =>
      import('./features/oferta-form/oferta-form-page.component').then(
        (m) => m.OfertaFormPageComponent
      ),
  },
  {
    path: 'ayudar/reconstruccion',
    loadComponent: () =>
      import('./features/ayudar/ayudar-page.component').then((m) => m.AyudarPageComponent),
    data: { familia: 'reconstruccion' },
  },
  {
    path: 'ayudar/transporte',
    loadComponent: () =>
      import('./features/ayudar/ayudar-page.component').then((m) => m.AyudarPageComponent),
    data: { familia: 'transporte' },
  },
  {
    path: 'ayudar',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: 'coordinacion/reportes',
    loadComponent: () =>
      import('./features/reportes/censo-reporte-page.component').then(
        (m) => m.CensoReportePageComponent
      ),
  },
  {
    path: 'coordinacion',
    loadComponent: () =>
      import('./features/coordinacion/coordinacion-page.component').then(
        (m) => m.CoordinacionPageComponent
      ),
  },
  {
    path: 'puntos/nuevo',
    loadComponent: () =>
      import('./features/punto-form/punto-form-page.component').then(
        (m) => m.PuntoFormPageComponent
      ),
  },
  {
    path: 'puntos/:id/editar',
    loadComponent: () =>
      import('./features/punto-form/punto-form-page.component').then(
        (m) => m.PuntoFormPageComponent
      ),
  },
  {
    path: 'puntos/:id/necesidades/:needId/editar',
    loadComponent: () =>
      import('./features/necesidad-form/necesidad-form-page.component').then(
        (m) => m.NecesidadFormPageComponent
      ),
  },
  {
    path: 'puntos/:id/necesidades/nueva',
    loadComponent: () =>
      import('./features/necesidad-form/necesidad-form-page.component').then(
        (m) => m.NecesidadFormPageComponent
      ),
  },
  {
    path: 'puntos/:id/censo',
    loadComponent: () =>
      import('./features/censo/censo-afectados-page.component').then(
        (m) => m.CensoAfectadosPageComponent
      ),
  },
  {
    path: 'puntos/:id',
    loadComponent: () =>
      import('./features/punto-detail/punto-detail-page.component').then(
        (m) => m.PuntoDetailPageComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
