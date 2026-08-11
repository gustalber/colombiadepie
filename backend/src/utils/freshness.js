const STALE_AFTER_MS = 10 * 60 * 60 * 1000; // 10 hours

function isStale(updatedAt) {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > STALE_AFTER_MS;
}

function toPlain(record) {
  return record && typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
}

function maxTimestamp(...values) {
  let latest = 0;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time) && time > latest) {
      latest = time;
    }
  }
  return latest ? new Date(latest) : null;
}

/** Última actividad del albergue: ficha o necesidades recientes. */
function lastPuntoActivityAt(punto, necesidades = []) {
  const plain = toPlain(punto);
  const dates = [plain.updated_at, plain.last_necesidad_at];
  for (const need of necesidades) {
    const row = toPlain(need);
    dates.push(row.updated_at);
  }
  return maxTimestamp(...dates);
}

function withFreshness(record) {
  const plain = toPlain(record);
  const updatedAt = plain.updated_at ?? plain.updatedAt;

  return {
    ...plain,
    sin_confirmar: isStale(updatedAt),
  };
}

function withPuntoFreshness(punto, necesidades = []) {
  const plain = toPlain(punto);
  const activityAt = lastPuntoActivityAt(plain, necesidades);

  return {
    ...plain,
    sin_confirmar: isStale(activityAt),
  };
}

function withFreshnessList(records) {
  return records.map(withFreshness);
}

function withPuntoFreshnessList(records) {
  return records.map((row) => withPuntoFreshness(row));
}

module.exports = {
  STALE_AFTER_MS,
  isStale,
  lastPuntoActivityAt,
  withFreshness,
  withPuntoFreshness,
  withFreshnessList,
  withPuntoFreshnessList,
};
