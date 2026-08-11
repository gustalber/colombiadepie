const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const usuarioRepository = require('../usuarios/usuario.repository');
const { validateNewPassword } = require('../../utils/password');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email y contraseña son obligatorios',
        });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ error: 'Error de configuración del servidor' });
      }

      const user = await usuarioRepository.findByEmailWithPassword(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const payload = {
        id: user.id,
        rol: user.rol,
        punto_id: user.punto_id,
        nombre: user.nombre,
        email: user.email,
      };

      const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });

      return res.json({
        data: {
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            punto_id: user.punto_id,
          },
        },
      });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }

  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body || {};

      if (!current_password || !new_password) {
        return res.status(400).json({
          error: 'La contraseña actual y la nueva son obligatorias',
        });
      }

      const passwordError = validateNewPassword(new_password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      if (current_password === new_password) {
        return res.status(400).json({
          error: 'La nueva contraseña debe ser diferente a la actual',
        });
      }

      const user = await usuarioRepository.findByIdWithPassword(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'La contraseña actual no es correcta' });
      }

      const password_hash = await bcrypt.hash(new_password, 10);
      await usuarioRepository.updatePassword(user.id, password_hash);

      return res.json({ data: { ok: true } });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
  }
}

module.exports = new AuthController();
