const { Router } = require('express');
const necesidadController = require('./necesidad.controller');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get(
  '/',
  authenticate,
  authorize('coordinador', 'responsable_albergue', 'verificador'),
  (req, res) => necesidadController.listByPunto(req, res)
);

nestedRouter.get(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue', 'verificador'),
  (req, res) => necesidadController.getById(req, res)
);

nestedRouter.post(
  '/',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => necesidadController.create(req, res)
);

nestedRouter.put(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => necesidadController.update(req, res)
);

nestedRouter.patch(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => necesidadController.update(req, res)
);

nestedRouter.patch(
  '/:id/estado',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => necesidadController.updateEstado(req, res)
);

nestedRouter.delete(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => necesidadController.remove(req, res)
);

const rootRouter = Router();

rootRouter.get(
  '/',
  optionalAuthenticate,
  (req, res) => necesidadController.listOpen(req, res)
);

rootRouter.patch(
  '/:id/verificar',
  authenticate,
  authorize('coordinador', 'verificador'),
  (req, res) => necesidadController.verify(req, res)
);

module.exports = {
  nestedRouter,
  rootRouter,
};
