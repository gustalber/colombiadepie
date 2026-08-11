const OfertaItem = require('./oferta-item.model');

class OfertaItemRepository {
  async findById(id) {
    return OfertaItem.findByPk(id);
  }

  async findByOfertaId(ofertaId) {
    return OfertaItem.findAll({
      where: { oferta_id: ofertaId },
      order: [['created_at', 'ASC']],
    });
  }

  async create(data) {
    return OfertaItem.create(data);
  }

  async bulkCreate(rows) {
    return OfertaItem.bulkCreate(rows);
  }

  async update(id, data) {
    const [affectedRows] = await OfertaItem.update(data, {
      where: { id },
    });
    if (affectedRows === 0) return null;
    return this.findById(id);
  }
}

module.exports = new OfertaItemRepository();
