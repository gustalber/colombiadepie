const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const Afectado = require('./afectado.model');
const AfectadoIntegrante = require('./afectado-integrante.model');
const PuntoDemanda = require('../puntos-demanda/punto-demanda.model');

const INTEGRANTE_INCLUDE = {
  model: AfectadoIntegrante,
  as: 'integrantes',
  separate: true,
  order: [
    ['orden', 'ASC'],
    ['created_at', 'ASC'],
  ],
};

const PUNTO_CAPTADOR_INCLUDE = {
  model: PuntoDemanda,
  as: 'captado_por',
  attributes: ['id', 'nombre', 'municipio', 'verificado', 'censo_afectados_habilitado'],
};

const PUNTO_ACOGIDA_INCLUDE = {
  model: PuntoDemanda,
  as: 'punto_acogida',
  attributes: ['id', 'nombre', 'municipio'],
};

class AfectadoRepository {
  async findAndCount(filters = {}) {
    const where = {};

    if (filters.registrado_por_punto_id) {
      where.registrado_por_punto_id = filters.registrado_por_punto_id;
    }
    if (filters.municipio) {
      where.municipio = filters.municipio;
    }
    if (filters.situacion_actual) {
      where.situacion_actual = filters.situacion_actual;
    }
    if (filters.estado_registro) {
      where.estado_registro = filters.estado_registro;
    }
    if (filters.modo_registro) {
      where.modo_registro = filters.modo_registro;
    }
    if (filters.punto_acogida_id) {
      where.punto_acogida_id = filters.punto_acogida_id;
    }
    if (filters.en_albergue === true) {
      where.situacion_actual = 'en_albergue';
    }
    if (filters.en_albergue === false) {
      where.situacion_actual = { [Op.ne]: 'en_albergue' };
    }

    return Afectado.findAndCountAll({
      where,
      include: [PUNTO_CAPTADOR_INCLUDE, PUNTO_ACOGIDA_INCLUDE, INTEGRANTE_INCLUDE],
      limit: filters.limit,
      offset: filters.offset,
      order: [['updated_at', 'DESC']],
      distinct: true,
    });
  }

  async findByIdAndPuntoId(id, puntoId) {
    return Afectado.findOne({
      where: {
        id,
        registrado_por_punto_id: puntoId,
      },
      include: [PUNTO_CAPTADOR_INCLUDE, PUNTO_ACOGIDA_INCLUDE, INTEGRANTE_INCLUDE],
    });
  }

  async findById(id, transaction = null) {
    return Afectado.findByPk(id, {
      include: [PUNTO_CAPTADOR_INCLUDE, PUNTO_ACOGIDA_INCLUDE, INTEGRANTE_INCLUDE],
      transaction,
    });
  }

  async createWithIntegrantes(afectadoData, integrantes = []) {
    return sequelize.transaction(async (transaction) => {
      const afectado = await Afectado.create(afectadoData, { transaction });

      if (integrantes.length > 0) {
        await AfectadoIntegrante.bulkCreate(
          integrantes.map((row, index) => ({
            ...row,
            afectado_id: afectado.id,
            orden: row.orden != null ? row.orden : index,
          })),
          { transaction }
        );
      }

      return this.findById(afectado.id, transaction);
    });
  }

  async updateWithIntegrantes(id, afectadoData, integrantes = null) {
    return sequelize.transaction(async (transaction) => {
      const [affectedRows] = await Afectado.update(afectadoData, {
        where: { id },
        transaction,
      });

      if (affectedRows === 0) return null;

      if (integrantes !== null) {
        await AfectadoIntegrante.destroy({
          where: { afectado_id: id },
          transaction,
        });

        if (integrantes.length > 0) {
          await AfectadoIntegrante.bulkCreate(
            integrantes.map((row, index) => ({
              ...row,
              afectado_id: id,
              orden: row.orden != null ? row.orden : index,
            })),
            { transaction }
          );
        }
      }

      return Afectado.findByPk(id, {
        include: [PUNTO_CAPTADOR_INCLUDE, PUNTO_ACOGIDA_INCLUDE, INTEGRANTE_INCLUDE],
        transaction,
      });
    });
  }

  async delete(id) {
    return Afectado.destroy({ where: { id } });
  }

  async getReporteStats(filters = {}) {
    const where = {};
    if (filters.registrado_por_punto_id) {
      where.registrado_por_punto_id = filters.registrado_por_punto_id;
    }
    if (filters.municipio) {
      where.municipio = filters.municipio;
    }
    if (filters.estado_registro) {
      where.estado_registro = filters.estado_registro;
    } else {
      where.estado_registro = 'activo';
    }

    const summaryAttributes = [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_registros'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_personas')), 0), 'total_personas'],
      [
        sequelize.fn(
          'COALESCE',
          sequelize.fn(
            'SUM',
            sequelize.literal(
              "CASE WHEN situacion_actual = 'en_albergue' THEN total_personas ELSE 0 END"
            )
          ),
          0
        ),
        'en_albergue_personas',
      ],
      [
        sequelize.fn(
          'COALESCE',
          sequelize.fn(
            'SUM',
            sequelize.literal("CASE WHEN tipo_registro = 'hogar' THEN 1 ELSE 0 END")
          ),
          0
        ),
        'hogares',
      ],
      [
        sequelize.fn(
          'COALESCE',
          sequelize.fn(
            'SUM',
            sequelize.literal("CASE WHEN tipo_registro = 'persona_sola' THEN 1 ELSE 0 END")
          ),
          0
        ),
        'personas_solas',
      ],
    ];

    const groupAttributes = (field) => [
      field,
      [sequelize.fn('COUNT', sequelize.col('id')), 'registros'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_personas')), 0), 'personas'],
    ];

    const edadAttributes = [
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('ninos_0_5')), 0), 'ninos_0_5'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('ninos_6_17')), 0), 'ninos_6_17'],
      [
        sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('adultos_hombres')), 0),
        'adultos_hombres',
      ],
      [
        sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('adultos_mujeres')), 0),
        'adultos_mujeres',
      ],
      [
        sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('adultos_mayores_60')), 0),
        'adultos_mayores_60',
      ],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('embarazadas')), 0), 'embarazadas'],
      [
        sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('personas_discapacidad')), 0),
        'personas_discapacidad',
      ],
      [
        sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('personas_enfermedad_cronica')), 0),
        'personas_enfermedad_cronica',
      ],
    ];

    const [summaryRow, municipioRows, situacionRows, viviendaRows, captadorRows, edadRows, liteRows] =
      await Promise.all([
        Afectado.findOne({
          where,
          attributes: summaryAttributes,
          raw: true,
        }),
        Afectado.findAll({
          where,
          attributes: groupAttributes('municipio'),
          group: ['municipio'],
          order: [[sequelize.literal('personas'), 'DESC']],
          raw: true,
        }),
        Afectado.findAll({
          where,
          attributes: groupAttributes('situacion_actual'),
          group: ['situacion_actual'],
          order: [[sequelize.literal('personas'), 'DESC']],
          raw: true,
        }),
        Afectado.findAll({
          where,
          attributes: groupAttributes('vivienda_estado'),
          group: ['vivienda_estado'],
          order: [[sequelize.literal('personas'), 'DESC']],
          raw: true,
        }),
        Afectado.findAll({
          where,
          attributes: [
            'registrado_por_punto_id',
            [sequelize.fn('COUNT', sequelize.col('Afectado.id')), 'registros'],
            [
              sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_personas')), 0),
              'personas',
            ],
          ],
          include: [
            {
              model: PuntoDemanda,
              as: 'captado_por',
              attributes: ['nombre', 'municipio'],
            },
          ],
          group: [
            'registrado_por_punto_id',
            'captado_por.id',
            'captado_por.nombre',
            'captado_por.municipio',
          ],
          order: [[sequelize.literal('personas'), 'DESC']],
          limit: 12,
          subQuery: false,
          raw: true,
        }),
        Afectado.findOne({
          where,
          attributes: edadAttributes,
          raw: true,
        }),
        Afectado.findAll({
          where,
          attributes: ['necesidades', 'created_at', 'total_personas'],
          raw: true,
        }),
      ]);

    const { buildReporteFromAggregates } = require('../../utils/censo-reporte');

    return buildReporteFromAggregates({
      summaryRow,
      municipioRows,
      situacionRows,
      viviendaRows,
      captadorRows,
      edadRow: edadRows,
      liteRows,
    });
  }
}

module.exports = new AfectadoRepository();
