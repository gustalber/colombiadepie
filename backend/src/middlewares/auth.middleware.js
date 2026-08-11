const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function attachUserFromToken(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = jwt.verify(token, secret);
  return {
    id: payload.id,
    rol: payload.rol,
    punto_id: payload.punto_id || null,
    nombre: payload.nombre,
    email: payload.email,
  };
}

function authenticate(req, res, next) {
  try {
    if (req.user && req.user.id) {
      return next();
    }

    const user = attachUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'No autenticado' });
  }
}

/**
 * Attaches req.user when a valid Bearer token is present; never blocks.
 */
function optionalAuthenticate(req, res, next) {
  try {
    const user = attachUserFromToken(req);
    if (user) {
      req.user = user;
    }
    return next();
  } catch (_error) {
    return next();
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};
