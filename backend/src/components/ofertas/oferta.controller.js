const Oferta = require('./oferta.model');
const OfertaItem = require('./oferta-item.model');
const sequelize = require('../../config/database');
const ofertaRepository = require('./oferta.repository');
const { withFreshness, withFreshnessList } = require('../../utils/freshness');
const {
  sanitizeForViewer,
  sanitizeListForViewer,
} = require('../../utils/privacy');

const { CATEGORIAS: VALID_CATEGORIAS } = require('../../constants/categorias');
const VALID_ESTADOS = ['disponible', 'comprometida', 'entregada'];

class OfertaController {
  async createPublic(req, res) {
    const tx = await sequelize.transaction();
    try {
      const header = this.#pickHeaderFields(req.body);
      const items = this.#normalizeItems(req.body);
      const validationError = this.#validateCreate(header, items);
      if (validationError) {
        await tx.rollback();
        return res.status(400).json({ error: validationError });
      }

      const oferta = await Oferta.create(
        {
          ...header,
          estado: 'disponible',
        },
        { transaction: tx }
      );

      await OfertaItem.bulkCreate(
        items.map((item) => ({
          ...item,
          oferta_id: oferta.id,
          estado: 'disponible',
        })),
        { transaction: tx }
      );

      await tx.commit();

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

  #validateCreate(header, items) {
    if (!header.oferente_nombre || !String(header.oferente_nombre).trim()) {
      return 'El nombre del oferente es obligatorio';
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
    }
    return null;
  }
}

module.exports = new OfertaController();
