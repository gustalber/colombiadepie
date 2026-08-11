import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MUNICIPIOS_POR_DEPARTAMENTO } from '../../core/data/municipios';
import {
  breadcrumbEntity,
  faqEntity,
  howToEntity,
  organizationAndWebsiteGraph,
} from '../../core/seo/seo.schema';
import { SeoService } from '../../core/seo/seo.service';
import { SEO_PAGES } from '../../core/seo/seo.pages';
import { slugify } from '../../core/utils/slug';
import { ShellComponent } from '../../layout/shell.component';

const FAQS = [
  {
    question: '¿Dónde encuentro albergues cerca de mí en Colombia?',
    answer:
      'En Colombia de Pie puedes ver un mapa y una lista de albergues, refugios temporales y puntos de acogida con cupos, municipio y qué tan fresca está la información. Filtra por municipio en Valle del Cauca, Chocó, Risaralda, Quindío o Caldas.',
  },
  {
    question: '¿Qué es la ayuda de última milla?',
    answer:
      'Es la ayuda que llega directamente al albergue o punto de demanda: agua, alimentos, medicamentos, aseo, cobijas, ropa, pañales y más. Coordinación empareja ofertas con necesidades abiertas para que la donación llegue donde hace falta.',
  },
  {
    question: '¿Puedo donar sin crear cuenta?',
    answer:
      'Sí. En “Puedo ayudar” registras qué puedes aportar y un contacto privado. Coordinación usa ese contacto solo para emparejar la ayuda; no se publica en el mapa.',
  },
  {
    question: '¿Cómo registro un albergue o punto de acogida?',
    answer:
      'Cualquiera puede publicar un albergue desde “Registrar albergue”. Queda visible de inmediato y marcado como sin verificar hasta que coordinación lo revise. Incluye cupos, municipio y, si puedes, la ubicación en el mapa.',
  },
  {
    question: '¿Qué necesito para pedir ayuda desde un albergue?',
    answer:
      'El responsable del albergue (o coordinación) reporta necesidades abiertas por categoría y urgencia. Luego la ayuda emparejada aparece como “Por recibir” para confirmar cuando llega.',
  },
];

@Component({
  selector: 'app-ayuda-humanitaria-page',
  standalone: true,
  imports: [ShellComponent, RouterLink],
  template: `
    <app-shell>
      <article class="seo-article">
        <nav class="seo-breadcrumbs" aria-label="Miga de pan">
          <a routerLink="/">Inicio</a>
          <span aria-hidden="true">/</span>
          <span>Ayuda humanitaria</span>
        </nav>

        <h1>Ayuda humanitaria y albergues de última milla en Colombia</h1>
        <p class="seo-lead">
          Colombia de Pie conecta <strong>albergues</strong>,
          <strong>puntos de acogida</strong> y personas que quieren
          <strong>donar ayuda</strong> cuando hay emergencia: inundaciones,
          desplazamientos u otras crisis. Sin rodeos: ver cupos, pedir lo que falta
          y ofrecer agua, alimentos, cobijas u otros insumos prioritarios.
        </p>

        <div class="hero-actions">
          <a class="btn btn-primary" routerLink="/">Ver qué hace falta</a>
          <a class="btn btn-secondary" routerLink="/mapa">Mapa de albergues</a>
          <a class="btn btn-ghost" routerLink="/puntos/nuevo">Registrar un albergue</a>
        </div>

        <section>
          <h2>Cómo funciona en 4 pasos</h2>
          <ol class="seo-steps">
            <li>
              <strong>Encuentra un albergue</strong> en el mapa o por municipio:
              mira estado (activo, lleno, cerrado) y frescura de los datos.
            </li>
            <li>
              <strong>Pide ayuda</strong> desde el albergue: agua, alimentos,
              medicamentos, aseo, cobijas, ropa, pañales y más.
            </li>
            <li>
              <strong>Ofrece una donación</strong> sin cuenta; coordinación empareja
              tu oferta con una necesidad abierta.
            </li>
            <li>
              <strong>Confirma la entrega</strong> en el albergue cuando la ayuda
              llega (última milla real).
            </li>
          </ol>
        </section>

        <section>
          <h2>Glosario rápido</h2>
          <dl class="seo-glossary">
            <dt>Albergue / refugio temporal</dt>
            <dd>Lugar que acoge personas afectadas; reporta cupos y necesidades.</dd>
            <dt>Punto de acogida / punto comunitario</dt>
            <dd>Espacio autogestionado u oficial que concentra demanda de ayuda.</dd>
            <dt>Ayuda de última milla</dt>
            <dd>Donación que llega al punto donde se necesita, no solo a bodegas centrales.</dd>
            <dt>Necesidad</dt>
            <dd>Pedido concreto del albergue (categoría, cantidad, urgencia).</dd>
            <dt>Oferta</dt>
            <dd>Lo que una persona u organización puede aportar.</dd>
            <dt>Emparejamiento</dt>
            <dd>Cruce entre oferta y necesidad que coordinación confirma y pone en camino.</dd>
          </dl>
        </section>

        <section>
          <h2>Albergues por municipio (cobertura)</h2>
          <p>
            Páginas por municipio para buscar
            <em>albergues cerca</em>, cupos y cómo donar en tu zona:
          </p>
          @for (dep of departamentos; track dep.departamento) {
            <h3>{{ dep.departamento }}</h3>
            <ul class="seo-muni-list">
              @for (m of dep.municipios; track m) {
                <li>
                  <a [routerLink]="['/albergues', slug(m)]">Albergues en {{ m }}</a>
                </li>
              }
            </ul>
          }
        </section>

        <section>
          <h2>Preguntas frecuentes</h2>
          @for (f of faqs; track f.question) {
            <details class="ops-fold" style="margin-bottom: 0.65rem">
              <summary>{{ f.question }}</summary>
              <p style="margin-top: 0.65rem">{{ f.answer }}</p>
            </details>
          }
        </section>

        <p class="seo-note">
          Datos personales con recolección mínima · Ley 1581 de 2012.
          La información de albergues se actualiza con reportes de campo;
          verifica siempre el estado “por confirmar” si lleva muchas horas sin
          actualización.
        </p>
      </article>
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
        font-size: 1.08rem;
      }
      .seo-steps {
        padding-left: 1.2rem;
        display: grid;
        gap: 0.65rem;
      }
      .seo-glossary {
        display: grid;
        gap: 0.55rem;
      }
      .seo-glossary dt {
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .seo-glossary dd {
        margin: 0 0 0.55rem;
        color: var(--ink-soft);
      }
      .seo-muni-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0.35rem 0.75rem;
        padding-left: 1.1rem;
        margin: 0 0 1rem;
      }
      .seo-note {
        margin-top: 1.5rem;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class AyudaHumanitariaPageComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly departamentos = MUNICIPIOS_POR_DEPARTAMENTO;
  readonly faqs = FAQS;
  readonly slug = slugify;

  ngOnInit(): void {
    this.seo.apply(SEO_PAGES['ayudaHumanitaria']);
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        ...(organizationAndWebsiteGraph(this.seo)['@graph'] as Record<string, unknown>[]),
        faqEntity(this.seo, '/ayuda-humanitaria', FAQS),
        howToEntity(
          'Cómo pedir o donar ayuda de última milla',
          'Pasos para usar Colombia de Pie en una emergencia.',
          [
            'Abre el mapa y filtra albergues por municipio.',
            'Revisa cupos, estado y necesidades abiertas del albergue.',
            'Ofrece ayuda desde la página de inicio o registra un albergue en /puntos/nuevo.',
            'Coordinación empareja la donación; el albergue confirma la llegada.',
          ]
        ),
        breadcrumbEntity(this.seo, [
          { name: 'Inicio', path: '/' },
          { name: 'Ayuda humanitaria', path: '/ayuda-humanitaria' },
        ]),
      ],
    });
  }
}
