const Usuario = require('./usuario.model');

class UsuarioRepository {
  async findByEmailWithPassword(email) {
    return Usuario.unscoped().findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findByEmail(email) {
    return Usuario.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id) {
    return Usuario.findByPk(id);
  }

  async findByPuntoId(puntoId) {
    return Usuario.findAll({
      where: { punto_id: puntoId },
      order: [['created_at', 'DESC']],
    });
  }

  async list({ rol, punto_id, limit = 50, offset = 0 } = {}) {
    const where = {};
    if (rol) where.rol = rol;
    if (punto_id) where.punto_id = punto_id;

    const { rows, count } = await Usuario.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
    });

    return { rows, count };
  }

  async create(data) {
    return Usuario.create({
      ...data,
      email: data.email.toLowerCase().trim(),
    });
  }

  async findByIdWithPassword(id) {
    return Usuario.unscoped().findByPk(id);
  }

  async updatePassword(id, password_hash) {
    const user = await Usuario.findByPk(id);
    if (!user) return null;
    // password_hash is excluded by defaultScope; update via unscoped instance
    await Usuario.unscoped().update({ password_hash }, { where: { id } });
    return this.findById(id);
  }
}

module.exports = new UsuarioRepository();
