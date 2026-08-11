'use strict';

const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_oferta_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      oferta_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'r_ofertas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      categoria: {
        type: Sequelize.ENUM(
          'agua',
          'alimentos',
          'medicamentos',
          'aseo',
          'cobijas',
          'colchonetas',
          'panales',
          'otros'
        ),
        allowNull: false,
      },
      cantidad: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unidad: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      estado: {
        type: Sequelize.ENUM('disponible', 'comprometida', 'entregada'),
        allowNull: false,
        defaultValue: 'disponible',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('r_oferta_items', ['oferta_id'], {
      name: 'r_oferta_items_oferta_id_idx',
    });
    await queryInterface.addIndex('r_oferta_items', ['categoria'], {
      name: 'r_oferta_items_categoria_idx',
    });
    await queryInterface.addIndex('r_oferta_items', ['estado'], {
      name: 'r_oferta_items_estado_idx',
    });

    // Backfill one item per existing oferta
    const [ofertas] = await queryInterface.sequelize.query(
      `SELECT id, categoria, cantidad, unidad, descripcion, estado, created_at, updated_at
       FROM r_ofertas`
    );

    if (ofertas.length) {
      const rows = ofertas.map((o) => ({
        id: randomUUID(),
        oferta_id: o.id,
        categoria: o.categoria,
        cantidad: o.cantidad,
        unidad: o.unidad,
        descripcion: o.descripcion,
        estado: o.estado || 'disponible',
        created_at: o.created_at,
        updated_at: o.updated_at,
      }));
      await queryInterface.bulkInsert('r_oferta_items', rows);
    }

    await queryInterface.addColumn('r_emparejamientos', 'oferta_item_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'r_oferta_items', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.sequelize.query(`
      UPDATE r_emparejamientos e
      SET oferta_item_id = i.id
      FROM r_oferta_items i
      WHERE i.oferta_id = e.oferta_id
    `);

    await queryInterface.changeColumn('r_emparejamientos', 'oferta_item_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'r_oferta_items', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('r_emparejamientos', ['oferta_item_id'], {
      name: 'r_emparejamientos_oferta_item_id_idx',
    });

    // Drop flat category fields from header (keep rollup estado)
    await queryInterface.removeIndex('r_ofertas', 'r_ofertas_categoria_idx').catch(() => undefined);
    await queryInterface.removeColumn('r_ofertas', 'categoria');
    await queryInterface.removeColumn('r_ofertas', 'cantidad');
    await queryInterface.removeColumn('r_ofertas', 'unidad');
    await queryInterface.removeColumn('r_ofertas', 'descripcion');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_ofertas_categoria";'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('r_ofertas', 'categoria', {
      type: Sequelize.ENUM(
        'agua',
        'alimentos',
        'medicamentos',
        'aseo',
        'cobijas',
        'colchonetas',
        'panales',
        'otros'
      ),
      allowNull: true,
    });
    await queryInterface.addColumn('r_ofertas', 'cantidad', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('r_ofertas', 'unidad', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('r_ofertas', 'descripcion', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE r_ofertas o
      SET
        categoria = i.categoria,
        cantidad = i.cantidad,
        unidad = i.unidad,
        descripcion = i.descripcion
      FROM (
        SELECT DISTINCT ON (oferta_id) *
        FROM r_oferta_items
        ORDER BY oferta_id, created_at ASC
      ) i
      WHERE i.oferta_id = o.id
    `);

    await queryInterface.removeIndex(
      'r_emparejamientos',
      'r_emparejamientos_oferta_item_id_idx'
    ).catch(() => undefined);
    await queryInterface.removeColumn('r_emparejamientos', 'oferta_item_id');
    await queryInterface.dropTable('r_oferta_items');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_oferta_items_categoria";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_oferta_items_estado";'
    );
  },
};
