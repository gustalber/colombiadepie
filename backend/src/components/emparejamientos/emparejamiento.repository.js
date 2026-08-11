const { Op } = require('sequelize');
const Emparejamiento = require('./emparejamiento.model');
const Necesidad = require('../necesidades/necesidad.model');
const Oferta = require('../ofertas/oferta.model');
const OfertaItem = require('../ofertas/oferta-item.model');

class EmparejamientoRepository {
  async findAndCountAll(filters = {}) {
    const where = {};

    if (filters.estado) {
      if (Array.isArray(filters.estado)) {
        where.estado = { [Op.in]: filters.estado };
      } else {
        where.estado = filters.estado;
      }
    }
    if (filters.necesidad_id) {
      where.necesidad_id = filters.necesidad_id;
    }
    if (filters.oferta_id) {
      where.oferta_id = filters.oferta_id;
    }
    if (filters.oferta_item_id) {
      where.oferta_item_id = filters.oferta_item_id;
    }

    const necesidadInclude = {
      model: Necesidad,
      as: 'necesidad',
      required: !!filters.punto_id,
    };
    if (filters.punto_id) {
      necesidadInclude.where = { punto_id: filters.punto_id };
    }

    return Emparejamiento.findAndCountAll({
      where,
      include: [
        necesidadInclude,
        { model: Oferta, as: 'oferta' },
        { model: OfertaItem, as: 'oferta_item' },
      ],
      limit: filters.limit,
      offset: filters.offset,
      order: [['updated_at', 'DESC']],
      distinct: true,
    });
  }

  async findById(id) {
    return Emparejamiento.findByPk(id, {
      include: [
        { model: Necesidad, as: 'necesidad' },
        { model: Oferta, as: 'oferta' },
        { model: OfertaItem, as: 'oferta_item' },
      ],
    });
  }

  async create(data) {
    return Emparejamiento.create(data);
  }

  async update(id, data) {
    const [affectedRows] = await Emparejamiento.update(data, {
      where: { id },
    });
    if (affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    return Emparejamiento.destroy({ where: { id } });
  }

  async countActiveByOfertaItemId(ofertaItemId, excludeId = null) {
    const where = {
      oferta_item_id: ofertaItemId,
      estado: { [Op.notIn]: ['cancelado', 'entregado'] },
    };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return Emparejamiento.count({ where });
  }

  async countActiveByNecesidadId(necesidadId, excludeId = null) {
    const where = {
      necesidad_id: necesidadId,
      estado: { [Op.notIn]: ['cancelado', 'entregado'] },
    };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return Emparejamiento.count({ where });
  }
}

module.exports = new EmparejamientoRepository();
