const { Router } = require('express');
const usuarioController = require('./usuario.controller');
const {
  authenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const router = Router();

router.use(authenticate, authorize('coordinador'));

router.get('/', (req, res) => usuarioController.list(req, res));

router.get('/por-punto/:puntoId', (req, res) =>
  usuarioController.listByPunto(req, res)
);

router.post('/', (req, res) => usuarioController.createForPunto(req, res));

router.post('/:id/reset-password', (req, res) =>
  usuarioController.resetPassword(req, res)
);

module.exports = router;
