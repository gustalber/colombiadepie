const { Router } = require('express');
const emparejamientoController = require('./emparejamiento.controller');
const {
  authenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => emparejamientoController.list(req, res)
);

router.get(
  '/:id',
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => emparejamientoController.getById(req, res)
);

router.post('/', authorize('coordinador', 'responsable_albergue'), (req, res) =>
  emparejamientoController.create(req, res)
);

router.put('/:id', authorize('coordinador'), (req, res) =>
  emparejamientoController.update(req, res)
);

router.patch('/:id', authorize('coordinador'), (req, res) =>
  emparejamientoController.update(req, res)
);

router.patch(
  '/:id/estado',
  authorize('coordinador', 'responsable_albergue'),
  (req, res) => emparejamientoController.updateEstado(req, res)
);

router.post(
  '/:id/confirmar-entrega',
  authorize('responsable_albergue'),
  (req, res) => emparejamientoController.confirmarEntrega(req, res)
);

router.delete('/:id', authorize('coordinador'), (req, res) =>
  emparejamientoController.remove(req, res)
);

module.exports = router;
