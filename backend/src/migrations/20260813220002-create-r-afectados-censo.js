'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('r_afectados', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      registrado_por_punto_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'r_puntos_demanda',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      registrado_por_usuario_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'r_usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tipo_registro: {
        type: Sequelize.ENUM('hogar', 'persona_sola'),
        allowNull: false,
        defaultValue: 'hogar',
      },
      modo_registro: {
        type: Sequelize.ENUM('agregado', 'detallado'),
        allowNull: false,
        defaultValue: 'agregado',
      },
      nombre_referencia: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      telefono_contacto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      municipio: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      vereda_barrio: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      direccion_aproximada: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      total_personas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      ninos_0_5: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ninos_6_17: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      adultos_hombres: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      adultos_mujeres: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      adultos_mayores_60: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      embarazadas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      personas_discapacidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      personas_enfermedad_cronica: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      vivienda_estado: {
        type: Sequelize.ENUM(
          'destruida',
          'inhabitable',
          'danada_habitada',
          'sin_dano',
          'no_sabe'
        ),
        allowNull: false,
        defaultValue: 'no_sabe',
      },
      desplazado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      motivo_principal: {
        type: Sequelize.ENUM('terremoto', 'replica', 'precaucion', 'otro'),
        allowNull: false,
        defaultValue: 'terremoto',
      },
      situacion_actual: {
        type: Sequelize.ENUM(
          'en_albergue',
          'vivienda_propia_danada',
          'casa_familiar_amigo',
          'arrendamiento',
          'carpa_improvisada',
          'otro_municipio',
          'no_ubicado',
          'otro'
        ),
        allowNull: false,
        defaultValue: 'no_ubicado',
      },
      punto_acogida_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'r_puntos_demanda',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      municipio_ubicacion_actual: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ubicacion_texto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      necesidades: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      prioridad: {
        type: Sequelize.ENUM('alta', 'media', 'baja'),
        allowNull: false,
        defaultValue: 'media',
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      estado_registro: {
        type: Sequelize.ENUM(
          'activo',
          'actualizado',
          'reubicado',
          'atendido',
          'cerrado'
        ),
        allowNull: false,
        defaultValue: 'activo',
      },
      fuente: {
        type: Sequelize.ENUM(
          'visita_campo',
          'autoreporte',
          'llamada',
          'referido',
          'otro'
        ),
        allowNull: false,
        defaultValue: 'visita_campo',
      },
      ultima_verificacion: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consentimiento_registro: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      consentimiento_en: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.createTable('r_afectado_integrantes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      afectado_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'r_afectados',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rol_en_hogar: {
        type: Sequelize.ENUM('jefe_hogar', 'conyuge', 'hijo', 'otro_familiar', 'otro'),
        allowNull: false,
        defaultValue: 'otro',
      },
      rango_edad: {
        type: Sequelize.ENUM('0_5', '6_17', '18_59', '60_mas'),
        allowNull: false,
      },
      sexo: {
        type: Sequelize.ENUM('masculino', 'femenino', 'otro', 'no_indica'),
        allowNull: true,
      },
      condicion_especial: {
        type: Sequelize.ENUM(
          'ninguna',
          'embarazo',
          'discapacidad',
          'enfermedad_cronica',
          'menor_no_acompanado'
        ),
        allowNull: false,
        defaultValue: 'ninguna',
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('r_afectados', ['registrado_por_punto_id'], {
      name: 'r_afectados_registrado_por_punto_id_idx',
    });
    await queryInterface.addIndex('r_afectados', ['municipio'], {
      name: 'r_afectados_municipio_idx',
    });
    await queryInterface.addIndex('r_afectados', ['situacion_actual'], {
      name: 'r_afectados_situacion_actual_idx',
    });
    await queryInterface.addIndex('r_afectados', ['estado_registro'], {
      name: 'r_afectados_estado_registro_idx',
    });
    await queryInterface.addIndex('r_afectados', ['punto_acogida_id'], {
      name: 'r_afectados_punto_acogida_id_idx',
    });
    await queryInterface.addIndex('r_afectados', ['modo_registro'], {
      name: 'r_afectados_modo_registro_idx',
    });

    await queryInterface.addIndex('r_afectado_integrantes', ['afectado_id'], {
      name: 'r_afectado_integrantes_afectado_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('r_afectado_integrantes');
    await queryInterface.dropTable('r_afectados');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectado_integrantes_rol_en_hogar";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectado_integrantes_rango_edad";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectado_integrantes_sexo";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectado_integrantes_condicion_especial";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_tipo_registro";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_modo_registro";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_vivienda_estado";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_motivo_principal";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_situacion_actual";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_prioridad";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_estado_registro";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_r_afectados_fuente";'
    );
  },
};
