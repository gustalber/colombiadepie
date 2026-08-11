function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function aggregateNecesidades(rows) {
  const counts = new Map();
  for (const row of rows) {
    const list = Array.isArray(row.necesidades) ? row.necesidades : [];
    for (const raw of list) {
      const key = String(raw || '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([nombre, menciones]) => ({ nombre, menciones }))
    .sort((a, b) => b.menciones - a.menciones)
    .slice(0, 12);
}

function aggregatePorDia(rows, days = 14) {
  const map = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { fecha: d.toISOString().slice(0, 10), registros: 0, personas: 0 });
  }

  for (const row of rows) {
    if (!row.created_at) continue;
    const fecha = new Date(row.created_at).toISOString().slice(0, 10);
    if (!map.has(fecha)) continue;
    const bucket = map.get(fecha);
    bucket.registros += 1;
    bucket.personas += toNumber(row.total_personas);
  }

  return [...map.values()];
}

function mapGroupRows(rows, keyField, labelFn = (v) => v) {
  return rows
    .map((row) => ({
      clave: row[keyField],
      etiqueta: labelFn(row[keyField]),
      registros: toNumber(row.registros),
      personas: toNumber(row.personas),
    }))
    .filter((row) => row.clave != null && row.clave !== '')
    .sort((a, b) => b.personas - a.personas);
}

function buildReporteFromAggregates({
  summaryRow,
  municipioRows,
  situacionRows,
  viviendaRows,
  captadorRows,
  edadRow,
  liteRows,
}) {
  const totalRegistros = toNumber(summaryRow?.total_registros);
  const totalPersonas = toNumber(summaryRow?.total_personas);
  const enAlberguePersonas = toNumber(summaryRow?.en_albergue_personas);
  const hogares = toNumber(summaryRow?.hogares);
  const personasSolas = toNumber(summaryRow?.personas_solas);

  return {
    resumen: {
      total_registros: totalRegistros,
      total_personas: totalPersonas,
      en_albergue_personas: enAlberguePersonas,
      fuera_albergue_personas: Math.max(0, totalPersonas - enAlberguePersonas),
      hogares,
      personas_solas: personasSolas,
      puntos_captadores: captadorRows.length,
      embarazadas: toNumber(edadRow?.embarazadas),
      personas_discapacidad: toNumber(edadRow?.personas_discapacidad),
      personas_enfermedad_cronica: toNumber(edadRow?.personas_enfermedad_cronica),
    },
    por_municipio: mapGroupRows(municipioRows, 'municipio'),
    por_situacion: mapGroupRows(situacionRows, 'situacion_actual'),
    por_vivienda: mapGroupRows(viviendaRows, 'vivienda_estado'),
    por_edad: {
      ninos_0_5: toNumber(edadRow?.ninos_0_5),
      ninos_6_17: toNumber(edadRow?.ninos_6_17),
      adultos_hombres: toNumber(edadRow?.adultos_hombres),
      adultos_mujeres: toNumber(edadRow?.adultos_mujeres),
      adultos_mayores_60: toNumber(edadRow?.adultos_mayores_60),
    },
    por_captador: captadorRows.map((row) => ({
      punto_id: row.registrado_por_punto_id,
      nombre: row['captado_por.nombre'] || row.nombre || 'Sin nombre',
      municipio: row['captado_por.municipio'] || row.municipio || '',
      registros: toNumber(row.registros),
      personas: toNumber(row.personas),
    })),
    necesidades_top: aggregateNecesidades(liteRows),
    registros_por_dia: aggregatePorDia(liteRows),
    generado_en: new Date().toISOString(),
  };
}

module.exports = {
  buildReporteFromAggregates,
  aggregateNecesidades,
  aggregatePorDia,
};
