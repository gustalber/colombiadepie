const { Op } = require('sequelize');
const Oferta = require('./oferta.model');
const OfertaItem = require('./oferta-item.model');

class OfertaRepository {
  #itemInclude(filters = {}) {
    const include = {
      model: OfertaItem,
      as: 'items',
      required: false,
    };
    if (filters.item_estado || filters.categoria) {
      include.required = true;
      include.where = {};
      if (filters.item_estado) include.where.estado = filters.item_estado;
      if (filters.categoria) include.where.categoria = filters.categoria;
    }
    return include;
  }

  async findAndCountAll(filters = {}) {
    const where = {};
    if (filters.estado) {
      where.estado = filters.estado;
    }

    return Oferta.findAndCountAll({
      where,
      include: [this.#itemInclude(filters)],
      limit: filters.limit,
      offset: filters.offset,
      order: [['updated_at', 'DESC']],
      distinct: true,
    });
  }

  async findById(id) {
    return Oferta.findByPk(id, {
      include: [{ model: OfertaItem, as: 'items' }],
    });
  }

  async create(data) {
    return Oferta.create(data);
  }

  async update(id, data) {
    const [affectedRows] = await Oferta.update(data, {
      where: { id },
    });
    if (affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    return Oferta.destroy({ where: { id } });
  }

  async refreshEstado(ofertaId) {
    const items = await OfertaItem.findAll({ where: { oferta_id: ofertaId } });
    if (!items.length) {
      await Oferta.update({ estado: 'disponible' }, { where: { id: ofertaId } });
      return 'disponible';
    }
    const allEntregada = items.every((i) => i.estado === 'entregada');
    const anyDisponible = items.some((i) => i.estado === 'disponible');
    let estado = 'comprometida';
    if (allEntregada) estado = 'entregada';
    else if (anyDisponible) estado = 'disponible';
    await Oferta.update({ estado }, { where: { id: ofertaId } });
    return estado;
  }
}

module.exports = new OfertaRepository();
