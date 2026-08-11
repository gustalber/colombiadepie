import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PuntosApiService } from '../../core/api.services';
import { MUNICIPIOS, MUNICIPIOS_POR_DEPARTAMENTO } from '../../core/data/municipios';
import { PuntoDemanda } from '../../core/models';
import { breadcrumbEntity, organizationAndWebsiteGraph } from '../../core/seo/seo.schema';
import { SeoService } from '../../core/seo/seo.service';
import { timeAgo } from '../../core/utils/labels';
import { slugify } from '../../core/utils/slug';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-albergues-municipio-page',
  standalone: true,
  imports: [ShellComponent, RouterLink],
  template: `
    <app-shell>
      @if (!municipio()) {
        <div class="banner warn">
          No encontramos ese municipio.
          <a routerLink="/ayuda-humanitaria">Ver cobertura</a>
        </div>
      } @else {
        @let m = municipio()!;
        <article class="seo-article">
          <nav class="seo-breadcrumbs" aria-label="Miga de pan">
            <a routerLink="/">Inicio</a>
            <span aria-hidden="true">/</span>
            <a routerLink="/ayuda-humanitaria">Ayuda humanitaria</a>
            <span aria-hidden="true">/</span>
            <span>{{ m }}</span>
          </nav>

          <h1>Albergues y ayuda humanitaria en {{ m }}</h1>
          <p class="seo-lead">
            Directorio vivo de <strong>albergues</strong>,
            <strong>refugios temporales</strong> y
            <strong>puntos de acogida</strong> en {{ m }}
            @if (departamento()) {
              ({{ departamento() }})
            }.
            Mira cupos, necesidades abiertas y ofrece
            <strong>ayuda de última milla</strong> (agua, alimentos, cobijas y más).
          </p>

          <div class="hero-actions">
            <a class="btn btn-primary" routerLink="/mapa" [queryParams]="{ municipio: m }">
              Ver en el mapa
            </a>
            <a class="btn btn-secondary" routerLink="/" [queryParams]="{ municipio: m }">Donar ayuda</a>
            <a class="btn btn-ghost" routerLink="/puntos/nuevo">Registrar albergue</a>
          </div>

          <section class="panel" style="margin-top: 1rem">
            <h2>Albergues reportados en {{ m }}</h2>
            @if (loading()) {
              <div class="empty">Cargando…</div>
            } @else if (puntos().length === 0) {
              <div class="empty">
                Aún no hay albergues publicados en {{ m }}.
                Si conoces uno, <a routerLink="/puntos/nuevo">regístralo</a>.
              </div>
            } @else {
              <div class="list">
                @for (p of puntos(); track p.id) {
                  <a class="card-link" [routerLink]="['/puntos', p.id]">
                    <strong>{{ p.nombre }}</strong>
                    <div>{{ timeAgo(p.updated_at) }}</div>
                  </a>
                }
              </div>
            }
          </section>

          <section style="margin-top: 1.25rem">
            <h2>Cómo ayudar en {{ m }}</h2>
            <p>
              1) Revisa necesidades en cada albergue.
              2) En <a routerLink="/">Puedo ayudar</a> indica qué donas y desde dónde sales.
              3) Coordinación empareja tu oferta con pedidos abiertos en {{ m }} u otros municipios cercanos.
            </p>
          </section>

          <section style="margin-top: 1rem">
            <h2>Otros municipios cercanos</h2>
            <ul class="seo-muni-list">
              @for (near of nearby(); track near) {
                <li>
                  <a [routerLink]="['/albergues', slug(near)]">Albergues en {{ near }}</a>
                </li>
              }
            </ul>
          </section>
        </article>
      }
    </app-shell>
  `,
  styles: [
    `
      .seo-article {
        max-width: 760px;
      }
      .seo-breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        font-size: 0.9rem;
        margin-bottom: 0.85rem;
        color: var(--ink-soft);
      }
      .seo-lead {
        font-size: 1.05rem;
      }
      .seo-muni-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0.35rem 0.75rem;
        padding-left: 1.1rem;
      }
    `,
  ],
})
export class AlberguesMunicipioPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PuntosApiService);
  private readonly seo = inject(SeoService);
  private sub?: Subscription;

  readonly municipio = signal<string | null>(null);
  readonly departamento = signal<string | null>(null);
  readonly puntos = signal<PuntoDemanda[]>([]);
  readonly loading = signal(true);
  readonly nearby = signal<string[]>([]);

  readonly timeAgo = timeAgo;
  readonly slug = slugify;

  ngOnInit(): void {
    this.sub = this.route.paramMap
      .pipe(
        map((params) => params.get('municipio') || ''),
        tap((slugParam) => this.bootstrapMunicipio(slugParam)),
        switchMap((slugParam) => {
          const found = this.resolveMunicipio(slugParam);
          if (!found) return of([] as PuntoDemanda[]);
          return this.api.list({ municipio: found }).pipe(
            map((res) => res.data),
            catchError(() => of([] as PuntoDemanda[]))
          );
        })
      )
      .subscribe((data) => {
        this.puntos.set(data);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private resolveMunicipio(slugParam: string): string | null {
    return (
      MUNICIPIOS.find((m) => slugify(m) === slugParam) ||
      MUNICIPIOS.find((m) => slugify(m) === slugify(slugParam)) ||
      null
    );
  }

  private bootstrapMunicipio(slugParam: string): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.loading.set(true);
    this.puntos.set([]);

    const found = this.resolveMunicipio(slugParam);
    if (!found) {
      this.municipio.set(null);
      this.departamento.set(null);
      this.nearby.set([]);
      this.seo.apply({
        path: `/albergues/${slugParam}`,
        title: 'Municipio no encontrado',
        description: 'Ese municipio no está en la cobertura actual de Colombia de Pie.',
        robots: 'noindex,follow',
      });
      return;
    }

    this.municipio.set(found);
    const dep =
      MUNICIPIOS_POR_DEPARTAMENTO.find((d) => d.municipios.includes(found))?.departamento ||
      null;
    this.departamento.set(dep);

    const peers =
      MUNICIPIOS_POR_DEPARTAMENTO.find((d) => d.municipios.includes(found))?.municipios || [];
    this.nearby.set(peers.filter((x) => x !== found).slice(0, 12));

    const path = `/albergues/${slugify(found)}`;
    this.seo.apply({
      path,
      title: `Albergues en ${found}: cupos y ayuda humanitaria`,
      description: `Encuentra albergues y puntos de acogida en ${found}${
        dep ? `, ${dep}` : ''
      }. Consulta cupos, necesidades y cómo donar ayuda de última milla (agua, alimentos, cobijas).`,
      keywords: [
        `albergues ${found}`,
        `ayuda humanitaria ${found}`,
        `donar en ${found}`,
        `refugios temporales ${found}`,
        'ayuda de última milla',
        'puntos de acogida',
      ],
    });

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        ...(organizationAndWebsiteGraph(this.seo)['@graph'] as Record<string, unknown>[]),
        breadcrumbEntity(this.seo, [
          { name: 'Inicio', path: '/' },
          { name: 'Ayuda humanitaria', path: '/ayuda-humanitaria' },
          { name: found, path },
        ]),
        {
          '@type': 'CollectionPage',
          name: `Albergues en ${found}`,
          description: `Directorio de albergues y ayuda humanitaria en ${found}.`,
          url: this.seo.absoluteUrl(path),
          about: {
            '@type': 'Place',
            name: found,
            containedInPlace: dep
              ? { '@type': 'AdministrativeArea', name: dep }
              : { '@type': 'Country', name: 'Colombia' },
          },
        },
      ],
    });
  }
}
