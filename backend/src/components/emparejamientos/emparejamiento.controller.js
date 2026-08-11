const emparejamientoRepository = require('./emparejamiento.repository');
const necesidadRepository = require('../necesidades/necesidad.repository');
const ofertaRepository = require('../ofertas/oferta.repository');
const ofertaItemRepository = require('../ofertas/oferta-item.repository');
const { withFreshness, withFreshnessList } = require('../../utils/freshness');
const { sanitizeForViewer } = require('../../utils/privacy');
const puntoDemandaRepository = require('../puntos-demanda/punto-demanda.repository');
const {
  puntoVerificationError,
  necesidadVerificationError,
} = require('../../utils/verification');

const VALID_ESTADOS = [
  'propuesto',
  'confirmado',
  'en_camino',
  'entregado',
  'cancelado',
];

const ACTIVE_MATCH_ESTADOS = ['propuesto', 'confirmado', 'en_camino'];

function resolveMatchQty(needQty, offerQty) {
  const need =
    needQty === '' || needQty == null ? null : Number(needQty);
  const offer =
    offerQty === '' || offerQty == null ? null : Number(offerQty);

  if (need != null && Number.isNaN(need)) return null;
  if (offer != null && Number.isNaN(offer)) return null;

  if (need == null && offer == null) return null;
  if (need == null) return offer;
  if (offer == null) return need;
  return Math.min(need, offer);
}

class EmparejamientoController {
  async list(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      let puntoId = req.query.punto_id || undefined;
      let estado = req.query.estado || undefined;

      if (req.user.rol === 'responsable_albergue') {
        if (!req.user.punto_id) {
          return res.status(403).json({ error: 'Usuario sin albergue asignado' });
        }
        puntoId = req.user.punto_id;
        if (!estado) {
          estado = ['propuesto', 'confirmado', 'en_camino'];
        }
      }

      if (typeof estado === 'string' && estado.includes(',')) {
        estado = estado.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const result = await emparejamientoRepository.findAndCountAll({
        estado,
        necesidad_id: req.query.necesidad_id,
        oferta_id: req.query.oferta_id,
        oferta_item_id: req.query.oferta_item_id,
        punto_id: puntoId,
        limit,
        offset,
      });

      const data = withFreshnessList(result.rows).map((row) =>
        this.#sanitizeMatch(row, req.user.rol)
      );

      return res.json({
        data,
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing emparejamientos:', error);
      return res.status(500).json({ error: 'Error al listar emparejamientos' });
    }
  }

  async getById(req, res) {
    try {
      const match = await emparejamientoRepository.findById(req.params.id);
      if (!match) {
        return res.status(404).json({ error: 'Emparejamiento no encontrado' });
      }

      if (!this.#canViewMatch(req.user, match)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      return res.json({
        data: this.#sanitizeMatch(withFreshness(match), req.user.rol),
      });
    } catch (error) {
      console.error('Error fetching emparejamiento:', error);
      return res.status(500).json({ error: 'Error al obtener emparejamiento' });
    }
  }

  async create(req, res) {
    try {
      const { necesidad_id, oferta_item_id, oferta_id, estado, transportista, eta } =
        req.body;

      if (!necesidad_id || (!oferta_item_id && !oferta_id)) {
        return res.status(400).json({
          error: 'necesidad_id y oferta_item_id son obligatorios',
        });
      }

      const matchEstado = estado || 'propuesto';
      if (!VALID_ESTADOS.includes(matchEstado)) {
        return res.status(400).json({
          error: `El estado debe ser: ${VALID_ESTADOS.join(', ')}`,
        });
      }
      if (matchEstado === 'cancelado' || matchEstado === 'entregado') {
        return res.status(400).json({
          error: 'Crea el emparejamiento como propuesto, confirmado o en_camino',
        });
      }

      const necesidad = await necesidadRepository.findById(necesidad_id);
      if (!necesidad) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      const necesidadError = necesidadVerificationError(necesidad);
      if (necesidadError) {
        return res.status(409).json({ error: necesidadError });
      }

      const punto = await puntoDemandaRepository.findById(necesidad.punto_id);
      const puntoError = puntoVerificationError(punto);
      if (puntoError) {
        return res.status(409).json({ error: puntoError });
      }

      let item = null;
      if (oferta_item_id) {
        item = await ofertaItemRepository.findById(oferta_item_id);
      } else if (oferta_id) {
        const oferta = await ofertaRepository.findById(oferta_id);
        if (!oferta) {
          return res.status(404).json({ error: 'Oferta no encontrada' });
        }
        const plain = oferta.toJSON ? oferta.toJSON() : oferta;
        item =
          (plain.items || []).find(
            (i) =>
              i.categoria === necesidad.categoria && i.estado === 'disponible'
          ) || null;
      }

      if (!item) {
        return res.status(404).json({ error: 'Ítem de oferta no encontrado' });
      }

      if (necesidad.categoria !== item.categoria) {
        return res.status(400).json({
          error:
            'La categoría de la necesidad y el ítem de oferta deben coincidir',
        });
      }

      if (item.estado !== 'disponible') {
        return res.status(409).json({
          error: 'Ese ítem de oferta no está disponible para emparejar',
        });
      }

      if (necesidad.estado === 'cubierta') {
        return res.status(409).json({
          error: 'La necesidad ya está cubierta',
        });
      }

      if (req.user.rol === 'responsable_albergue') {
        if (!req.user.punto_id) {
          return res.status(403).json({ error: 'Usuario sin albergue asignado' });
        }
        if (necesidad.punto_id !== req.user.punto_id) {
          return res.status(403).json({
            error: 'Solo puedes emparejar necesidades de tu albergue',
          });
        }
      }

      if (necesidad.cantidad != null && Number(necesidad.cantidad) <= 0) {
        return res.status(409).json({
          error:
            'Esta necesidad ya tiene cubierta o reservada toda su cantidad. Espera entregas o cancela un emparejamiento.',
        });
      }

      if (item.cantidad != null && Number(item.cantidad) <= 0) {
        return res.status(409).json({
          error: 'Ese ítem de oferta no tiene cantidad disponible',
        });
      }

      const matchCantidad = resolveMatchQty(necesidad.cantidad, item.cantidad);

      const match = await emparejamientoRepository.create({
        necesidad_id,
        oferta_id: item.oferta_id,
        oferta_item_id: item.id,
        cantidad: matchCantidad,
        estado: matchEstado,
        transportista: transportista || null,
        eta: eta || null,
      });

      await this.#reserveOnCreate(necesidad, item, matchCantidad);
      await this.#refreshNecesidadEstado(necesidad_id);
      await ofertaRepository.refreshEstado(item.oferta_id);

      const created = await emparejamientoRepository.findById(match.id);
      return res.status(201).json({
        data: this.#sanitizeMatch(withFreshness(created), req.user.rol),
      });
    } catch (error) {
      console.error('Error creating emparejamiento:', error);
      return res.status(500).json({ error: 'Error al crear emparejamiento' });
    }
  }

  async update(req, res) {
    try {
      const existing = await emparejamientoRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Emparejamiento no encontrado' });
      }

      const previousEstado = existing.estado;
      const payload = {};
      if (req.body.transportista !== undefined) {
        payload.transportista = req.body.transportista;
      }
      if (req.body.eta !== undefined) {
        payload.eta = req.body.eta;
      }
      if (req.body.estado !== undefined) {
        if (!VALID_ESTADOS.includes(req.body.estado)) {
          return res.status(400).json({
            error: `El estado debe ser: ${VALID_ESTADOS.join(', ')}`,
          });
        }
        payload.estado = req.body.estado;
      }

      const updated = await emparejamientoRepository.update(
        req.params.id,
        payload
      );
      await this.#syncRelatedStates(updated, previousEstado);

      const fresh = await emparejamientoRepository.findById(req.params.id);
      return res.json({
        data: this.#sanitizeMatch(withFreshness(fresh), req.user.rol),
      });
    } catch (error) {
      console.error('Error updating emparejamiento:', error);
      return res.status(500).json({ error: 'Error al actualizar emparejamiento' });
    }
  }

  async updateEstado(req, res) {
    try {
      const { estado } = req.body;
      if (!estado || !VALID_ESTADOS.includes(estado)) {
        return res.status(400).json({
          error: `El estado debe ser: ${VALID_ESTADOS.join(', ')}`,
        });
      }

      const existing = await emparejamientoRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Emparejamiento no encontrado' });
      }

      const authError = this.#authorizeEstadoChange(req.user, existing, estado);
      if (authError) {
        return res.status(authError.status).json({ error: authError.error });
      }

      const previousEstado = existing.estado;
      const updated = await emparejamientoRepository.update(req.params.id, {
        estado,
      });
      await this.#syncRelatedStates(updated, previousEstado);

      const fresh = await emparejamientoRepository.findById(req.params.id);
      return res.json({
        data: this.#sanitizeMatch(withFreshness(fresh), req.user.rol),
      });
    } catch (error) {
      console.error('Error updating emparejamiento estado:', error);
      return res
        .status(500)
        .json({ error: 'Error al actualizar estado de emparejamiento' });
    }
  }

  async confirmarEntrega(req, res) {
    req.body = { ...(req.body || {}), estado: 'entregado' };
    return this.updateEstado(req, res);
  }

  async remove(req, res) {
    try {
      const existing = await emparejamientoRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Emparejamiento no encontrado' });
      }

      await emparejamientoRepository.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting emparejamiento:', error);
      return res.status(500).json({ error: 'Error al eliminar emparejamiento' });
    }
  }

  async #reserveOnCreate(necesidad, item, matchCantidad) {
    if (matchCantidad != null && necesidad.cantidad != null) {
      const remaining = Math.max(0, Number(necesidad.cantidad) - matchCantidad);
      await necesidadRepository.update(necesidad.id, { cantidad: remaining });
    }

    if (matchCantidad != null && item.cantidad != null) {
      const left = Math.max(0, Number(item.cantidad) - matchCantidad);
      if (left > 0) {
        await ofertaItemRepository.update(item.id, {
          cantidad: left,
          estado: 'disponible',
        });
      } else {
        await ofertaItemRepository.update(item.id, {
          cantidad: 0,
          estado: 'comprometida',
        });
      }
    } else {
      await ofertaItemRepository.update(item.id, { estado: 'comprometida' });
    }
  }

  async #releaseReservation(match) {
    const qty =
      match.cantidad == null || match.cantidad === ''
        ? null
        : Number(match.cantidad);

    const necesidad = await necesidadRepository.findById(match.necesidad_id);
    if (necesidad && qty != null && !Number.isNaN(qty)) {
      const next = (necesidad.cantidad == null ? 0 : Number(necesidad.cantidad)) + qty;
      const solicitada =
        necesidad.cantidad_solicitada != null
          ? Number(necesidad.cantidad_solicitada)
          : null;
      await necesidadRepository.update(necesidad.id, {
        cantidad: solicitada != null ? Math.min(next, solicitada) : next,
      });
    }

    if (match.oferta_item_id) {
      const item = await ofertaItemRepository.findById(match.oferta_item_id);
      if (item) {
        const activeCount =
          await emparejamientoRepository.countActiveByOfertaItemId(
            item.id,
            match.id
          );
        const patch = { estado: 'disponible' };
        if (qty != null && !Number.isNaN(qty) && item.cantidad != null) {
          patch.cantidad = Number(item.cantidad) + qty;
        }
        if (activeCount > 0 && item.estado === 'comprometida') {
          // another active match still holds the item
          delete patch.estado;
        }
        if (activeCount === 0 || patch.cantidad != null) {
          if (activeCount === 0) patch.estado = 'disponible';
          await ofertaItemRepository.update(item.id, patch);
        }
      }
    }
  }

  async #refreshNecesidadEstado(necesidadId, excludeMatchId = null) {
    const necesidad = await necesidadRepository.findById(necesidadId);
    if (!necesidad || necesidad.estado === 'cubierta') return;

    const activeCount =
      await emparejamientoRepository.countActiveByNecesidadId(
        necesidadId,
        excludeMatchId
      );

    if (necesidad.cantidad != null) {
      if (Number(necesidad.cantidad) > 0) {
        await necesidadRepository.update(necesidadId, { estado: 'abierta' });
        return;
      }
      if (activeCount > 0) {
        await necesidadRepository.update(necesidadId, { estado: 'en_camino' });
        return;
      }
      await necesidadRepository.update(necesidadId, { estado: 'cubierta' });
      return;
    }

    // Sin cantidad explícita: comportamiento clásico todo-o-nada
    if (activeCount > 0) {
      await necesidadRepository.update(necesidadId, { estado: 'en_camino' });
    } else {
      await necesidadRepository.update(necesidadId, { estado: 'abierta' });
    }
  }

  async #syncRelatedStates(match, previousEstado) {
    if (!match) return;

    const estado = match.estado;
    const ofertaItemId = match.oferta_item_id;
    const ofertaId = match.oferta_id;
    const wasActive = ACTIVE_MATCH_ESTADOS.includes(previousEstado);
    const isActive = ACTIVE_MATCH_ESTADOS.includes(estado);

    if (estado === 'cancelado' && wasActive) {
      await this.#releaseReservation(match);
      await this.#refreshNecesidadEstado(match.necesidad_id, match.id);
      if (ofertaId) await ofertaRepository.refreshEstado(ofertaId);
      return;
    }

    if (estado === 'entregado') {
      if (ofertaItemId) {
        const item = await ofertaItemRepository.findById(ofertaItemId);
        if (item) {
          const activeCount =
            await emparejamientoRepository.countActiveByOfertaItemId(
              ofertaItemId,
              match.id
            );
          if (
            activeCount === 0 &&
            (item.cantidad == null || Number(item.cantidad) <= 0)
          ) {
            await ofertaItemRepository.update(ofertaItemId, {
              estado: 'entregada',
            });
          } else if (item.estado === 'comprometida' && activeCount === 0) {
            await ofertaItemRepository.update(ofertaItemId, {
              estado: 'entregada',
            });
          }
        }
      }
      if (ofertaId) await ofertaRepository.refreshEstado(ofertaId);

      const necesidad = await necesidadRepository.findById(match.necesidad_id);
      if (necesidad) {
        if (necesidad.cantidad != null) {
          await this.#refreshNecesidadEstado(match.necesidad_id, match.id);
        } else {
          // sin cantidad: una entrega cierra la necesidad
          await necesidadRepository.update(match.necesidad_id, {
            estado: 'cubierta',
          });
        }
      }
      return;
    }

    if (isActive) {
      await this.#refreshNecesidadEstado(match.necesidad_id);
      if (ofertaId) await ofertaRepository.refreshEstado(ofertaId);
    }
  }

  #sanitizeMatch(record, viewerRole) {
    const plain =
      record && typeof record.toJSON === 'function'
        ? record.toJSON()
        : { ...record };

    if (plain.oferta) {
      plain.oferta = sanitizeForViewer(plain.oferta, viewerRole);
    }

    return plain;
  }

  #matchPuntoId(match) {
    if (!match) return null;
    const plain = typeof match.toJSON === 'function' ? match.toJSON() : match;
    return plain.necesidad?.punto_id || null;
  }

  #canViewMatch(user, match) {
    if (user.rol === 'coordinador') return true;
    if (user.rol === 'responsable_albergue') {
      return !!user.punto_id && this.#matchPuntoId(match) === user.punto_id;
    }
    return false;
  }

  #authorizeEstadoChange(user, match, nextEstado) {
    if (user.rol === 'coordinador') {
      if (nextEstado === 'entregado') {
        return {
          status: 403,
          error:
            'La entrega la confirma el responsable del albergue cuando llega la ayuda',
        };
      }
      return null;
    }

    if (user.rol === 'responsable_albergue') {
      if (!user.punto_id || this.#matchPuntoId(match) !== user.punto_id) {
        return { status: 403, error: 'No autorizado para este albergue' };
      }
      if (!['en_camino', 'entregado', 'cancelado'].includes(nextEstado)) {
        return {
          status: 403,
          error: 'Solo puedes marcar en camino, entregado o cancelar',
        };
      }
      if (nextEstado === 'entregado' && match.estado !== 'en_camino') {
        return {
          status: 400,
          error: 'Solo puedes confirmar entrega cuando la ayuda está en camino',
        };
      }
      if (
        nextEstado === 'en_camino' &&
        !['propuesto', 'confirmado'].includes(match.estado)
      ) {
        return {
          status: 400,
          error: 'Solo puedes marcar en camino desde propuesto o confirmado',
        };
      }
      return null;
    }

    return { status: 403, error: 'No autorizado' };
  }
}

module.exports = new EmparejamientoController();
