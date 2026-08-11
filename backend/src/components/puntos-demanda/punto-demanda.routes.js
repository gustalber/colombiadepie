const { Router } = require('express');
const puntoDemandaController = require('./punto-demanda.controller');
const { nestedRouter: necesidadNestedRoutes } = require('../necesidades/necesidad.routes');
const { nestedRouter: afectadoNestedRoutes } = require('../afectados/afectado.routes');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const router = Router();

// Public read endpoints (personal contacts only if viewer is coordinador)
router.get('/', optionalAuthenticate, (req, res) =>
  puntoDemandaController.listPublic(req, res)
);

// Nested necesidades — must be registered before /:id
router.use('/:puntoId/necesidades', necesidadNestedRoutes);
router.use('/:puntoId/afectados', afectadoNestedRoutes);

router.get('/:id', optionalAuthenticate, (req, res) =>
  puntoDemandaController.getByIdPublic(req, res)
);

// Public create: anyone can register a shelter (unverified until coordination checks it)
router.post('/', optionalAuthenticate, (req, res) =>
  puntoDemandaController.create(req, res)
);

router.put(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => puntoDemandaController.update(req, res)
);

router.patch(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => puntoDemandaController.update(req, res)
);

router.delete(
  '/:id',
  authenticate,
  authorize('coordinador'),
  (req, res) => puntoDemandaController.remove(req, res)
);

router.patch(
  '/:id/verificar',
  authenticate,
  authorize('coordinador', 'verificador'),
  (req, res) => puntoDemandaController.verify(req, res)
);

module.exports = router;
