const { Router } = require('express');
const afectadoController = require('./afectado.controller');
const {
  authenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get(
  '/reporte',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => afectadoController.reporteByPunto(req, res)
);

nestedRouter.get(
  '/',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => afectadoController.listByPunto(req, res)
);

nestedRouter.get(
  '/:id',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => afectadoController.getById(req, res)
);

nestedRouter.post(
  '/',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => afectadoController.create(req, res)
);

nestedRouter.patch(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => afectadoController.update(req, res)
);

nestedRouter.delete(
  '/:id',
  authenticate,
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => afectadoController.remove(req, res)
);

const rootRouter = Router();

rootRouter.get(
  '/reporte',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => afectadoController.reporte(req, res)
);

rootRouter.get(
  '/',
  authenticate,
  authorize('coordinador', 'verificador'),
  (req, res) => afectadoController.listOpen(req, res)
);

module.exports = {
  nestedRouter,
  rootRouter,
};
