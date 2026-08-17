const Necesidad = require('../components/necesidades/necesidad.model');
const OfertaItem = require('../components/ofertas/oferta-item.model');
const emparejamientoRepository = require('../components/emparejamientos/emparejamiento.repository');

function resolveMatchQty(needQty, offerQty) {
  const need = needQty === '' || needQty == null ? null : Number(needQty);
  const offer = offerQty === '' || offerQty == null ? null : Number(offerQty);

  if (need != null && Number.isNaN(need)) return null;
  if (offer != null && Number.isNaN(offer)) return null;

  if (need == null && offer == null) return null;
  if (need == null) return offer;
  if (offer == null) return need;
  return Math.min(need, offer);
}

async function reserveOnCreate(necesidad, item, matchCantidad, options = {}) {
  const tx = options.transaction;
  const updateOpts = tx ? { transaction: tx } : {};

  if (matchCantidad != null && necesidad.cantidad != null) {
    const remaining = Math.max(0, Number(necesidad.cantidad) - matchCantidad);
    await Necesidad.update(
      { cantidad: remaining },
      { where: { id: necesidad.id }, ...updateOpts }
    );
  }

  if (matchCantidad != null && item.cantidad != null) {
    const left = Math.max(0, Number(item.cantidad) - matchCantidad);
    if (left > 0) {
      await OfertaItem.update(
        { cantidad: left, estado: 'disponible' },
        { where: { id: item.id }, ...updateOpts }
      );
    } else {
      await OfertaItem.update(
        { cantidad: 0, estado: 'comprometida' },
        { where: { id: item.id }, ...updateOpts }
      );
    }
  } else {
    await OfertaItem.update(
      { estado: 'comprometida' },
      { where: { id: item.id }, ...updateOpts }
    );
  }
}

async function refreshNecesidadEstado(necesidadId, excludeMatchId = null, options = {}) {
  const tx = options.transaction;
  const queryOpts = tx ? { transaction: tx } : {};
  const updateOpts = queryOpts;
  const necesidad =
    options.necesidad ||
    (await Necesidad.findByPk(necesidadId, queryOpts));
  if (!necesidad || necesidad.estado === 'cubierta') return;

  const activeCount = await emparejamientoRepository.countActiveByNecesidadId(
    necesidadId,
    excludeMatchId,
    queryOpts
  );

  if (necesidad.cantidad != null) {
    if (Number(necesidad.cantidad) > 0) {
      await Necesidad.update(
        { estado: 'abierta' },
        { where: { id: necesidadId }, ...updateOpts }
      );
      return;
    }
    if (activeCount > 0) {
      await Necesidad.update(
        { estado: 'en_camino' },
        { where: { id: necesidadId }, ...updateOpts }
      );
      return;
    }
    await Necesidad.update(
      { estado: 'cubierta' },
      { where: { id: necesidadId }, ...updateOpts }
    );
    return;
  }

  if (activeCount > 0) {
    await Necesidad.update(
      { estado: 'en_camino' },
      { where: { id: necesidadId }, ...updateOpts }
    );
  } else {
    await Necesidad.update(
      { estado: 'abierta' },
      { where: { id: necesidadId }, ...updateOpts }
    );
  }
}

module.exports = {
  resolveMatchQty,
  reserveOnCreate,
  refreshNecesidadEstado,
};
