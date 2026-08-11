import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  DepartamentoMunicipios,
  MUNICIPIOS_POR_DEPARTAMENTO,
} from '../data/municipios';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-municipio-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MunicipioSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="muni-select" [class.open]="open()">
      <input
        class="muni-input"
        type="search"
        role="combobox"
        [attr.aria-expanded]="open()"
        aria-autocomplete="list"
        [attr.aria-controls]="listId"
        [id]="inputId"
        [placeholder]="placeholder"
        [disabled]="disabled()"
        [value]="query()"
        (focus)="onFocus()"
        (input)="onQuery($event)"
        (keydown)="onKeydown($event)"
        autocomplete="off"
      />

      @if (value() && !disabled()) {
        <button
          class="muni-clear"
          type="button"
          aria-label="Limpiar municipio"
          (click)="clear($event)"
        >
          ×
        </button>
      }

      @if (open()) {
        <ul class="muni-list" [id]="listId" role="listbox">
          @if (allowEmpty) {
            <li
              role="option"
              class="muni-option empty"
              [class.active]="activeIndex() === -1"
              (mousedown)="selectEmpty($event)"
            >
              {{ emptyLabel }}
            </li>
          }

          @for (dep of filtered(); track dep.departamento) {
            <li class="muni-group" aria-hidden="true">{{ dep.departamento }}</li>
            @for (m of dep.municipios; track m; let i = $index) {
              <li
                role="option"
                class="muni-option"
                [class.selected]="m === value()"
                [class.active]="isActive(dep, m)"
                (mousedown)="selectMunicipio(m, $event)"
              >
                {{ m }}
              </li>
            }
          } @empty {
            <li class="muni-empty">Sin coincidencias</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }

      :host(.open) {
        z-index: 1200;
      }

      .muni-select {
        position: relative;
      }

      .muni-input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 0.75rem 2.2rem 0.75rem 0.85rem;
        background: #fff;
        font: inherit;
      }

      .muni-clear {
        position: absolute;
        right: 0.45rem;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2;
        border: 0;
        background: transparent;
        color: var(--ink-soft);
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.2rem 0.45rem;
      }

      .muni-list {
        position: absolute;
        z-index: 1300;
        left: 0;
        right: 0;
        top: calc(100% + 0.35rem);
        max-height: 280px;
        overflow: auto;
        margin: 0;
        padding: 0.35rem 0;
        list-style: none;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 12px;
        box-shadow: 0 10px 28px rgba(28, 42, 34, 0.18);
      }

      .muni-group {
        padding: 0.45rem 0.85rem 0.2rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--leaf);
      }

      .muni-option {
        padding: 0.55rem 0.85rem;
        cursor: pointer;
        color: var(--ink);
      }

      .muni-option:hover,
      .muni-option.active {
        background: var(--sand);
      }

      .muni-option.selected {
        font-weight: 700;
        color: var(--canopy-deep);
      }

      .muni-option.empty {
        color: var(--ink-soft);
        border-bottom: 1px solid var(--line);
        margin-bottom: 0.25rem;
      }

      .muni-empty {
        padding: 0.75rem 0.85rem;
        color: var(--ink-soft);
      }
    `,
  ],
})
export class MunicipioSelectComponent implements ControlValueAccessor, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() inputId = 'municipio';
  @Input() placeholder = 'Buscar municipio…';
  @Input() allowEmpty = false;
  @Input() emptyLabel = 'Todos';

  readonly listId = `muni-list-${Math.random().toString(36).slice(2, 9)}`;

  readonly value = signal('');
  readonly query = signal('');
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly filtered = signal<DepartamentoMunicipios[]>(MUNICIPIOS_POR_DEPARTAMENTO);
  readonly activeIndex = signal(this.allowEmpty ? -1 : 0);
  readonly flatOptions = signal<string[]>([]);

  @HostBinding('class.open')
  get hostOpen(): boolean {
    return this.open();
  }

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const next = value ?? '';
    this.value.set(next);
    this.query.set(next);
    this.applyFilter('');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onFocus(): void {
    if (this.disabled()) return;
    this.open.set(true);
    this.applyFilter(this.query() === this.value() ? '' : this.query());
  }

  onQuery(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.open.set(true);
    this.applyFilter(text);
    if (this.value() && text !== this.value()) {
      this.value.set('');
      this.onChange('');
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      this.open.set(true);
      this.applyFilter(this.query() === this.value() ? '' : this.query());
      event.preventDefault();
      return;
    }

    const options = this.flatOptions();
    const min = this.allowEmpty ? -1 : 0;
    const max = options.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set(Math.min(max, this.activeIndex() + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(Math.max(min, this.activeIndex() - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeIndex();
      if (idx === -1 && this.allowEmpty) {
        this.selectEmpty();
      } else if (idx >= 0 && options[idx]) {
        this.selectMunicipio(options[idx]);
      }
    } else if (event.key === 'Escape') {
      this.open.set(false);
      this.query.set(this.value());
    }
  }

  selectMunicipio(municipio: string, event?: Event): void {
    event?.preventDefault();
    this.value.set(municipio);
    this.query.set(municipio);
    this.onChange(municipio);
    this.onTouched();
    this.open.set(false);
  }

  selectEmpty(event?: Event): void {
    event?.preventDefault();
    this.value.set('');
    this.query.set('');
    this.onChange('');
    this.onTouched();
    this.open.set(false);
    this.applyFilter('');
  }

  clear(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectEmpty();
  }

  isActive(_dep: DepartamentoMunicipios, municipio: string): boolean {
    return this.flatOptions().indexOf(municipio) === this.activeIndex();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      if (!this.value()) {
        this.query.set('');
        this.applyFilter('');
      } else {
        this.query.set(this.value());
      }
      this.onTouched();
    }
  }

  ngOnDestroy(): void {
    // HostListener cleaned up by Angular
  }

  private applyFilter(text: string): void {
    const q = normalizeText(text);
    const next = MUNICIPIOS_POR_DEPARTAMENTO.map((dep) => ({
      departamento: dep.departamento,
      municipios: dep.municipios.filter(
        (m) =>
          !q ||
          normalizeText(m).includes(q) ||
          normalizeText(dep.departamento).includes(q)
      ),
    })).filter((dep) => dep.municipios.length > 0);

    this.filtered.set(next);
    const flat = next.flatMap((d) => d.municipios);
    this.flatOptions.set(flat);

    if (this.allowEmpty) {
      this.activeIndex.set(flat.length ? 0 : -1);
    } else {
      this.activeIndex.set(flat.length ? 0 : -1);
    }
  }
}
