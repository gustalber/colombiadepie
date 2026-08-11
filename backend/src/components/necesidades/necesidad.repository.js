const { Sequelize } = require('sequelize');
const Necesidad = require('./necesidad.model');
const PuntoDemanda = require('../puntos-demanda/punto-demanda.model');

class NecesidadRepository {
  async findAndCountByPuntoId(puntoId, filters = {}) {
    const where = { punto_id: puntoId };

    if (filters.estado) {
      where.estado = filters.estado;
    }
    if (filters.categoria) {
      where.categoria = filters.categoria;
    }
    if (filters.urgencia) {
      where.urgencia = filters.urgencia;
    }

    return Necesidad.findAndCountAll({
      where,
      limit: filters.limit,
      offset: filters.offset,
      order: [
        [
          Sequelize.literal(
            `CASE "Necesidad"."urgencia" WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END`
          ),
          'ASC',
        ],
        ['updated_at', 'DESC'],
      ],
    });
  }

  async findAndCountOpen(filters = {}) {
    const where = {};
    if (filters.estado) {
      where.estado = filters.estado;
    } else {
      where.estado = 'abierta';
    }
    if (filters.categoria) {
      where.categoria = filters.categoria;
    }
    if (filters.urgencia) {
      where.urgencia = filters.urgencia;
    }
    if (filters.verificado === true) {
      where.verificado = true;
    }

    const puntoWhere = { verificado: true };
    if (filters.municipio) {
      puntoWhere.municipio = filters.municipio;
    }

    return Necesidad.findAndCountAll({
      where,
      include: [
        {
          model: PuntoDemanda,
          as: 'punto',
          attributes: [
            'id',
            'nombre',
            'municipio',
            'estado',
            'verificado',
            'responsable_nombre',
            'responsable_contacto',
          ],
          required: true,
          where: puntoWhere,
        },
      ],
      limit: filters.limit,
      offset: filters.offset,
      order: [
        [
          Sequelize.literal(
            `CASE "Necesidad"."urgencia" WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END`
          ),
          'ASC',
        ],
        ['updated_at', 'DESC'],
      ],
      distinct: true,
    });
  }

  async findById(id) {
    return Necesidad.findByPk(id);
  }

  async findByIdAndPuntoId(id, puntoId) {
    return Necesidad.findOne({
      where: { id, punto_id: puntoId },
    });
  }

  async create(data) {
    return Necesidad.create(data);
  }

  async update(id, data) {
    const [affectedRows] = await Necesidad.update(data, {
      where: { id },
    });
    if (affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    return Necesidad.destroy({ where: { id } });
  }
}

module.exports = new NecesidadRepository();
