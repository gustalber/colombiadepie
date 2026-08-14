export interface DonorProfile {
  oferente_nombre: string;
  oferente_contacto: string;
}

const STORAGE_KEY = 'colombiadepie.donor';

export function loadDonorProfile(): DonorProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DonorProfile>;
    const nombre = parsed.oferente_nombre?.trim();
    if (!nombre) return null;
    return {
      oferente_nombre: nombre,
      oferente_contacto: parsed.oferente_contacto?.trim() || '',
    };
  } catch {
    return null;
  }
}

export function saveDonorProfile(profile: DonorProfile): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      oferente_nombre: profile.oferente_nombre.trim(),
      oferente_contacto: profile.oferente_contacto.trim(),
    })
  );
}

/** Normaliza teléfono para agrupar aportes del mismo donante. */
export function normalizeDonorContact(raw: string | null | undefined): string {
  return String(raw || '').replace(/\D/g, '');
}

/** Clave estable por persona (teléfono > nombre > id de respaldo). */
export function donorIdentityKey(
  nombre: string | null | undefined,
  contacto: string | null | undefined,
  fallbackId?: string
): string {
  const contact = normalizeDonorContact(contacto);
  if (contact.length >= 7) return `tel:${contact}`;
  const name = String(nombre || '').trim().toLowerCase();
  if (name) return `name:${name}`;
  return fallbackId ? `id:${fallbackId}` : 'unknown';
}

export function ofertaDonorKey(oferta: {
  id: string;
  oferente_nombre: string;
  oferente_contacto?: string | null;
}): string {
  return donorIdentityKey(
    oferta.oferente_nombre,
    oferta.oferente_contacto,
    oferta.id
  );
}
