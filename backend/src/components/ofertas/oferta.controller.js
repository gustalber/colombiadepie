const Oferta = require('./oferta.model');
const OfertaItem = require('./oferta-item.model');
const Emparejamiento = require('../emparejamientos/emparejamiento.model');
const sequelize = require('../../config/database');
const ofertaRepository = require('./oferta.repository');
const necesidadRepository = require('../necesidades/necesidad.repository');
const puntoDemandaRepository = require('../puntos-demanda/punto-demanda.repository');
const { withFreshness, withFreshnessList } = require('../../utils/freshness');
const {
  sanitizeForViewer,
  sanitizeListForViewer,
} = require('../../utils/privacy');
const {
  puntoVerificationError,
  necesidadVerificationError,
} = require('../../utils/verification');
const {
  resolveMatchQty,
  reserveOnCreate,
  refreshNecesidadEstado,
} = require('../../utils/match-reservation');

const { CATEGORIAS: VALID_CATEGORIAS } = require('../../constants/categorias');
const VALID_ESTADOS = ['disponible', 'comprometida', 'entregada'];

class OfertaController {
  async createPublic(req, res) {
    const header = this.#pickHeaderFields(req.body);
    const items = this.#normalizeItems(req.body);
    const necesidadId = req.body.necesidad_id
      ? String(req.body.necesidad_id).trim()
      : null;

    const validationError = this.#validateCreate(header, items, {
      necesidadId,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let necesidad = null;
    if (necesidadId) {
      const quickOfferResult = await this.#validateQuickOfferTarget(
        necesidadId,
        items[0]
      );
      if (quickOfferResult.error) {
        return res.status(quickOfferResult.status || 400).json({
          error: quickOfferResult.error,
        });
      }
      necesidad = quickOfferResult.necesidad;
    }

    const tx = await sequelize.transaction();
    try {
      const oferta = await Oferta.create(
        {
          ...header,
          estado: 'disponible',
        },
        { transaction: tx }
      );

      const createdItems = await OfertaItem.bulkCreate(
        items.map((item) => ({
          ...item,
          oferta_id: oferta.id,
          estado: 'disponible',
        })),
        { transaction: tx }
      );

      if (necesidad) {
        const item = createdItems[0];
        const matchCantidad = resolveMatchQty(necesidad.cantidad, item.cantidad);
        await Emparejamiento.create(
          {
            necesidad_id: necesidad.id,
            oferta_id: oferta.id,
            oferta_item_id: item.id,
            cantidad: matchCantidad,
            estado: 'confirmado',
          },
          { transaction: tx }
        );
        await reserveOnCreate(necesidad, item, matchCantidad, { transaction: tx });
        await refreshNecesidadEstado(necesidad.id, null, { transaction: tx });
      }

      await tx.commit();
      await ofertaRepository.refreshEstado(oferta.id);

      const created = await ofertaRepository.findById(oferta.id);
      return res.status(201).json({
        data: withFreshness(sanitizeForViewer(created, null)),
      });
    } catch (error) {
      await tx.rollback();
      console.error('Error creating oferta:', error);
      return res.status(500).json({ error: 'Error al crear oferta' });
    }
  }

  async list(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await ofertaRepository.findAndCountAll({
        categoria: req.query.categoria,
        estado: req.query.estado,
        item_estado: req.query.item_estado,
        limit,
        offset,
      });

      return res.json({
        data: withFreshnessList(
          sanitizeListForViewer(result.rows, req.user.rol)
        ),
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing ofertas:', error);
      return res.status(500).json({ error: 'Error al listar ofertas' });
    }
  }

  async getById(req, res) {
    try {
      const oferta = await ofertaRepository.findById(req.params.id);
      if (!oferta) {
        return res.status(404).json({ error: 'Oferta no encontrada' });
      }

      return res.json({
        data: withFreshness(sanitizeForViewer(oferta, req.user.rol)),
      });
    } catch (error) {
      console.error('Error fetching oferta:', error);
      return res.status(500).json({ error: 'Error al obtener oferta' });
    }
  }

  async update(req, res) {
    try {
      const existing = await ofertaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Oferta no encontrada' });
      }

      const payload = this.#pickHeaderFields(req.body);
      if (req.body.estado !== undefined) {
        if (!VALID_ESTADOS.includes(req.body.estado)) {
          return res.status(400).json({
            error: `El estado debe ser: ${VALID_ESTADOS.join(', ')}`,
          });
        }
        payload.estado = req.body.estado;
      }

      const updated = await ofertaRepository.update(req.params.id, payload);
      return res.json({
        data: withFreshness(sanitizeForViewer(updated, req.user.rol)),
      });
    } catch (error) {
      console.error('Error updating oferta:', error);
      return res.status(500).json({ error: 'Error al actualizar oferta' });
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

      const existing = await ofertaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Oferta no encontrada' });
      }

      const updated = await ofertaRepository.update(req.params.id, { estado });
      return res.json({
        data: withFreshness(sanitizeForViewer(updated, req.user.rol)),
      });
    } catch (error) {
      console.error('Error updating oferta estado:', error);
      return res.status(500).json({ error: 'Error al actualizar estado de oferta' });
    }
  }

  async remove(req, res) {
    try {
      const existing = await ofertaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Oferta no encontrada' });
      }

      await ofertaRepository.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting oferta:', error);
      return res.status(500).json({ error: 'Error al eliminar oferta' });
    }
  }

  #pickHeaderFields(body = {}) {
    const allowed = [
      'oferente_nombre',
      'oferente_contacto',
      'municipio_preferido',
      'municipios_alternativos',
    ];

    const payload = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        payload[key] = body[key];
      }
    }

    if (payload.municipio_preferido != null) {
      payload.municipio_preferido =
        String(payload.municipio_preferido).trim() || null;
    }

    if (payload.municipios_alternativos !== undefined) {
      const preferred = payload.municipio_preferido || null;
      const raw = Array.isArray(payload.municipios_alternativos)
        ? payload.municipios_alternativos
        : [];
      const seen = new Set();
      payload.municipios_alternativos = raw
        .map((m) => String(m || '').trim())
        .filter((m) => {
          if (!m || m === preferred || seen.has(m)) return false;
          seen.add(m);
          return true;
        });
    }

    return payload;
  }

  #normalizeItems(body = {}) {
    if (Array.isArray(body.items) && body.items.length) {
      return body.items.map((item) => ({
        categoria: item.categoria,
        cantidad:
          item.cantidad === '' || item.cantidad == null
            ? null
            : Number(item.cantidad),
        unidad: item.unidad ? String(item.unidad).trim() : null,
        descripcion: item.descripcion
          ? String(item.descripcion).trim()
          : null,
      }));
    }

    if (body.categoria) {
      return [
        {
          categoria: body.categoria,
          cantidad:
            body.cantidad === '' || body.cantidad == null
              ? null
              : Number(body.cantidad),
          unidad: body.unidad ? String(body.unidad).trim() : null,
          descripcion: body.descripcion
            ? String(body.descripcion).trim()
            : null,
        },
      ];
    }

    return [];
  }

  #validateCreate(header, items, options = {}) {
    if (!header.oferente_nombre || !String(header.oferente_nombre).trim()) {
      return 'El nombre del oferente es obligatorio';
    }
    if (
      options.necesidadId &&
      (!header.oferente_contacto || !String(header.oferente_contacto).trim())
    ) {
      return 'Indica tu teléfono o WhatsApp para que el albergue te contacte';
    }
    if (
      !header.municipio_preferido ||
      !String(header.municipio_preferido).trim()
    ) {
      return 'Indica el municipio donde te queda más fácil entregar';
    }
    if (!items.length) {
      return 'Agrega al menos una categoría a donar';
    }
    if (options.necesidadId && items.length !== 1) {
      return 'Yo aporto solo puede registrar una categoría a la vez';
    }

    const seen = new Set();
    for (const item of items) {
      if (!item.categoria || !VALID_CATEGORIAS.includes(item.categoria)) {
        return `Cada ítem necesita una categoría válida: ${VALID_CATEGORIAS.join(', ')}`;
      }
      if (seen.has(item.categoria)) {
        return `La categoría "${item.categoria}" está repetida. Únelas en un solo ítem.`;
      }
      seen.add(item.categoria);
      if (item.cantidad != null && Number.isNaN(Number(item.cantidad))) {
        return 'La cantidad debe ser un número';
      }
      if (item.cantidad != null && Number(item.cantidad) < 0) {
        return 'La cantidad no puede ser negativa';
      }
      if (options.necesidadId && (item.cantidad == null || Number(item.cantidad) <= 0)) {
        return 'Indica cuánto puedes aportar';
      }
    }
    return null;
  }

  async #validateQuickOfferTarget(necesidadId, item) {
    const necesidad = await necesidadRepository.findById(necesidadId);
    if (!necesidad) {
      return { status: 404, error: 'Necesidad no encontrada' };
    }

    const necesidadError = necesidadVerificationError(necesidad);
    if (necesidadError) {
      return { status: 409, error: necesidadError };
    }

    const punto = await puntoDemandaRepository.findById(necesidad.punto_id);
    const puntoError = puntoVerificationError(punto);
    if (puntoError) {
      return { status: 409, error: puntoError };
    }

    if (necesidad.estado === 'cubierta') {
      return { status: 409, error: 'Esta necesidad ya está cubierta' };
    }

    if (necesidad.categoria !== item.categoria) {
      return {
        status: 400,
        error: 'La categoría del aporte no coincide con la necesidad',
      };
    }

    if (necesidad.cantidad != null && Number(necesidad.cantidad) <= 0) {
      return {
        status: 409,
        error: 'Esta necesidad ya no tiene cantidad pendiente',
      };
    }

    if (item.cantidad != null && necesidad.cantidad != null) {
      if (Number(item.cantidad) > Number(necesidad.cantidad)) {
        return {
          status: 400,
          error: `El albergue necesita como máximo ${necesidad.cantidad} ${necesidad.unidad || ''}`.trim(),
        };
      }
    }

    return { necesidad };
  }
}

module.exports = new OfertaController();
