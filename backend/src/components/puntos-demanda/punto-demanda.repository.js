const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const PuntoDemanda = require('./punto-demanda.model');
const Necesidad = require('../necesidades/necesidad.model');

const LAST_NECESIDAD_AT = [
  sequelize.literal(`(
    SELECT MAX(n.updated_at)
    FROM r_necesidades AS n
    WHERE n.punto_id = "PuntoDemanda"."id"
  )`),
  'last_necesidad_at',
];

class PuntoDemandaRepository {
  async findAndCountAll(filters = {}) {
    const where = {};

    if (filters.municipio) {
      where.municipio = filters.municipio;
    }
    if (filters.estado) {
      where.estado = filters.estado;
    }
    if (filters.verificado === true) {
      where.verificado = true;
    }

    return PuntoDemanda.findAndCountAll({
      where,
      attributes: {
        include: [LAST_NECESIDAD_AT],
      },
      limit: filters.limit,
      offset: filters.offset,
      order: [['updated_at', 'DESC']],
    });
  }

  async findById(id) {
    return PuntoDemanda.findByPk(id, {
      attributes: {
        include: [LAST_NECESIDAD_AT],
      },
    });
  }

  async findByIdWithOpenNecesidades(id, options = {}) {
    const { verifiedOnly = false } = options;
    const necesidadWhere = { estado: 'abierta' };
    if (verifiedOnly) {
      necesidadWhere.verificado = true;
    }

    return PuntoDemanda.findByPk(id, {
      include: [
        {
          model: Necesidad,
          as: 'necesidades',
          where: necesidadWhere,
          required: false,
        },
      ],
    });
  }

  async findByNombreAndMunicipio(nombre, municipio) {
    return PuntoDemanda.findOne({
      where: {
        nombre: { [Op.iLike]: nombre },
        municipio: { [Op.iLike]: municipio },
      },
    });
  }

  async findAllWithCoordinates() {
    return PuntoDemanda.findAll({
      where: {
        lat: { [Op.ne]: null },
        lng: { [Op.ne]: null },
      },
    });
  }

  async create(data) {
    return PuntoDemanda.create(data);
  }

  async update(id, data) {
    const [affectedRows] = await PuntoDemanda.update(data, {
      where: { id },
    });
    if (affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    return PuntoDemanda.destroy({ where: { id } });
  }
}

module.exports = new PuntoDemandaRepository();
