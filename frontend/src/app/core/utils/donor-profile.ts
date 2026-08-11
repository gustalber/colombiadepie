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
