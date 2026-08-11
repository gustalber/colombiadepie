const PuntoDemanda = require('../components/puntos-demanda/punto-demanda.model');
const Necesidad = require('../components/necesidades/necesidad.model');
const Oferta = require('../components/ofertas/oferta.model');
const OfertaItem = require('../components/ofertas/oferta-item.model');
const Emparejamiento = require('../components/emparejamientos/emparejamiento.model');
const Usuario = require('../components/usuarios/usuario.model');
const Afectado = require('../components/afectados/afectado.model');
const AfectadoIntegrante = require('../components/afectados/afectado-integrante.model');

PuntoDemanda.hasMany(Necesidad, {
  foreignKey: 'punto_id',
  as: 'necesidades',
});

Necesidad.belongsTo(PuntoDemanda, {
  foreignKey: 'punto_id',
  as: 'punto',
});

Oferta.hasMany(OfertaItem, {
  foreignKey: 'oferta_id',
  as: 'items',
});

OfertaItem.belongsTo(Oferta, {
  foreignKey: 'oferta_id',
  as: 'oferta',
});

Necesidad.belongsToMany(Oferta, {
  through: Emparejamiento,
  foreignKey: 'necesidad_id',
  otherKey: 'oferta_id',
  as: 'ofertas',
});

Oferta.belongsToMany(Necesidad, {
  through: Emparejamiento,
  foreignKey: 'oferta_id',
  otherKey: 'necesidad_id',
  as: 'necesidades',
});

Emparejamiento.belongsTo(Necesidad, {
  foreignKey: 'necesidad_id',
  as: 'necesidad',
});

Emparejamiento.belongsTo(Oferta, {
  foreignKey: 'oferta_id',
  as: 'oferta',
});

Emparejamiento.belongsTo(OfertaItem, {
  foreignKey: 'oferta_item_id',
  as: 'oferta_item',
});

Necesidad.hasMany(Emparejamiento, {
  foreignKey: 'necesidad_id',
  as: 'emparejamientos',
});

Oferta.hasMany(Emparejamiento, {
  foreignKey: 'oferta_id',
  as: 'emparejamientos',
});

OfertaItem.hasMany(Emparejamiento, {
  foreignKey: 'oferta_item_id',
  as: 'emparejamientos',
});

Usuario.belongsTo(PuntoDemanda, {
  foreignKey: 'punto_id',
  as: 'punto',
});

PuntoDemanda.hasMany(Usuario, {
  foreignKey: 'punto_id',
  as: 'usuarios',
});

PuntoDemanda.hasMany(Afectado, {
  foreignKey: 'registrado_por_punto_id',
  as: 'afectados_captados',
});

Afectado.belongsTo(PuntoDemanda, {
  foreignKey: 'registrado_por_punto_id',
  as: 'captado_por',
});

Afectado.belongsTo(PuntoDemanda, {
  foreignKey: 'punto_acogida_id',
  as: 'punto_acogida',
});

Afectado.belongsTo(Usuario, {
  foreignKey: 'registrado_por_usuario_id',
  as: 'registrado_por',
});

Afectado.hasMany(AfectadoIntegrante, {
  foreignKey: 'afectado_id',
  as: 'integrantes',
});

AfectadoIntegrante.belongsTo(Afectado, {
  foreignKey: 'afectado_id',
  as: 'afectado',
});

module.exports = {
  PuntoDemanda,
  Necesidad,
  Oferta,
  OfertaItem,
  Emparejamiento,
  Usuario,
  Afectado,
  AfectadoIntegrante,
};
