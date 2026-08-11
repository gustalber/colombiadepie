const bcrypt = require('bcryptjs');
const usuarioRepository = require('./usuario.repository');
const puntoDemandaRepository = require('../puntos-demanda/punto-demanda.repository');
const { generateTemporaryPassword } = require('../../utils/password');

function toSafeUser(user) {
  const safe = user.toJSON ? user.toJSON() : { ...user };
  delete safe.password_hash;
  return safe;
}

class UsuarioController {
  async list(req, res) {
    try {
      const { rol, punto_id, limit, offset } = req.query;
      const result = await usuarioRepository.list({
        rol,
        punto_id,
        limit,
        offset,
      });

      return res.json({
        data: result.rows,
        total: result.count,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      });
    } catch (error) {
      console.error('Error listing usuarios:', error);
      return res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }

  async listByPunto(req, res) {
    try {
      const users = await usuarioRepository.findByPuntoId(req.params.puntoId);
      return res.json({
        data: users,
        total: users.length,
        limit: users.length,
        offset: 0,
      });
    } catch (error) {
      console.error('Error listing usuarios by punto:', error);
      return res.status(500).json({ error: 'Error al listar usuarios del albergue' });
    }
  }

  /**
   * Coordinador creates a responsable_albergue linked to a verified shelter.
   * Password is generated automatically and returned once in plain text.
   */
  async createForPunto(req, res) {
    try {
      const { nombre, email, punto_id } = req.body || {};

      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
      }
      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'El correo es obligatorio' });
      }
      if (!punto_id) {
        return res.status(400).json({ error: 'El albergue (punto_id) es obligatorio' });
      }

      const punto = await puntoDemandaRepository.findById(punto_id);
      if (!punto) {
        return res.status(404).json({ error: 'Albergue no encontrado' });
      }
      if (!punto.verificado) {
        return res.status(400).json({
          error: 'El albergue debe estar verificado antes de crear su usuario',
        });
      }

      const existing = await usuarioRepository.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
      }

      const temporaryPassword = generateTemporaryPassword();
      const password_hash = await bcrypt.hash(temporaryPassword, 10);
      const user = await usuarioRepository.create({
        nombre: String(nombre).trim(),
        email: String(email).trim(),
        password_hash,
        rol: 'responsable_albergue',
        punto_id: punto.id,
      });

      return res.status(201).json({
        data: {
          ...toSafeUser(user),
          temporary_password: temporaryPassword,
        },
      });
    } catch (error) {
      console.error('Error creating usuario for punto:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
      }
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  }

  /**
   * Coordinador resets password; new temporary password returned once.
   */
  async resetPassword(req, res) {
    try {
      const user = await usuarioRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const temporaryPassword = generateTemporaryPassword();
      const password_hash = await bcrypt.hash(temporaryPassword, 10);
      const updated = await usuarioRepository.updatePassword(user.id, password_hash);
      if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      return res.json({
        data: {
          ...toSafeUser(updated),
          temporary_password: temporaryPassword,
        },
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
  }
}

module.exports = new UsuarioController();
