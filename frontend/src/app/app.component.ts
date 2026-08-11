import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AlberguePromoService } from './core/albergue-promo.service';
import { AnalyticsService } from './core/analytics/analytics.service';
import { AlberguePromoDialogComponent } from './core/components/albergue-promo-dialog.component';
import { ErrorAlertComponent } from './core/components/error-alert.component';
import { LoadingOverlayComponent } from './core/components/loading-overlay.component';
import { organizationAndWebsiteGraph } from './core/seo/seo.schema';
import { SEO_PAGES } from './core/seo/seo.pages';
import { SeoService } from './core/seo/seo.service';
import { SeoPageConfig } from './core/seo/seo.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlberguePromoDialogComponent, LoadingOverlayComponent, ErrorAlertComponent],
  template: `
    <router-outlet />
    <app-loading-overlay />
    <app-error-alert />
    <app-albergue-promo-dialog />
  `,
  styles: `:host { display: block; min-height: 100vh; }`,
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly alberguePromo = inject(AlberguePromoService);
  private readonly analytics = inject(AnalyticsService);

  ngOnInit(): void {
    this.analytics.init();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.applyRouteSeo(e.urlAfterRedirects);
        this.maybeShowAlberguePromo(e.urlAfterRedirects);
        this.analytics.trackPageView(e.urlAfterRedirects);
      });
    this.applyRouteSeo(this.router.url);
    this.maybeShowAlberguePromo(this.router.url);
    this.analytics.trackPageView(this.router.url);
  }

  private maybeShowAlberguePromo(url: string): void {
    const path = url.split('?')[0];
    this.alberguePromo.considerShowing(path);
  }

  private applyRouteSeo(url: string): void {
    const path = url.split('?')[0];
    const config = this.matchSeo(path);
    if (!config || config === 'defer') return;

    this.seo.apply(config);
    if (config.robots?.includes('noindex')) {
      this.seo.clearJsonLd();
      return;
    }
    if (config.path === '/') {
      this.seo.setJsonLd(organizationAndWebsiteGraph(this.seo));
    }
  }

  private matchSeo(path: string): SeoPageConfig | 'defer' | null {
    if (path === '/' || path === '') return SEO_PAGES['home'];
    if (path === '/mapa') return SEO_PAGES['mapa'];
    if (path === '/ayudar/reconstruccion' || path === '/ayudar/transporte') {
      return SEO_PAGES['home'];
    }
    if (path === '/ayudar/registrar') {
      return {
        path,
        title: 'Registrar oferta de ayuda',
        description: 'Formulario para ofrecer ayuda humanitaria, materiales o transporte.',
        robots: 'noindex,nofollow',
      };
    }
    if (path === '/puntos/nuevo') return SEO_PAGES['registrar'];
    if (path === '/ayuda-humanitaria') return 'defer';
    if (path === '/login') return SEO_PAGES['login'];
    if (path === '/cuenta/contrasena') {
      return {
        path,
        title: 'Cambiar contraseña',
        description: 'Actualiza tu contraseña de acceso a Colombia de Pie.',
        robots: 'noindex,nofollow',
      };
    }
    if (path === '/coordinacion') return SEO_PAGES['coordinacion'];
    if (path === '/coordinacion/reportes') {
      return {
        path,
        title: 'Reportería de censo',
        description: 'Panel interno de visualización del censo de afectados.',
        robots: 'noindex,nofollow',
      };
    }
    if (path.startsWith('/albergues/')) return 'defer';
    if (/^\/puntos\/[^/]+$/.test(path)) return 'defer';
    if (path.includes('/editar') || path.includes('/necesidades/') || path.includes('/censo')) {
      return {
        path,
        title: 'Actualizar información',
        description: 'Formulario interno de Colombia de Pie.',
        robots: 'noindex,nofollow',
      };
    }
    return SEO_PAGES['home'];
  }
}
