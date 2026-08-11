const PRIVATE_FIELDS = ['responsable_contacto', 'oferente_contacto'];

/**
 * Strip personal contact fields (Ley 1581).
 * Coordinador y responsable de albergue pueden ver contactos para gestionar entregas.
 */
function sanitizeForViewer(record, viewerRole = null) {
  const plain =
    record && typeof record.toJSON === 'function' ? record.toJSON() : { ...record };

  if (viewerRole === 'coordinador' || viewerRole === 'responsable_albergue') {
    return plain;
  }

  const sanitized = { ...plain };
  for (const field of PRIVATE_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}

function sanitizeListForViewer(records, viewerRole = null) {
  return records.map((record) => sanitizeForViewer(record, viewerRole));
}

module.exports = {
  PRIVATE_FIELDS,
  sanitizeForViewer,
  sanitizeListForViewer,
};
