const { Router } = require('express');
const ofertaController = require('./oferta.controller');
const {
  authenticate,
  authorize,
} = require('../../middlewares/auth.middleware');

const router = Router();

// Public: "puedo ayudar"
router.post('/', (req, res) => ofertaController.createPublic(req, res));

// Coordinador panel (contacto visible solo para coordinador)
router.get(
  '/',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => ofertaController.list(req, res)
);

router.get(
  '/:id',
  authenticate,
  authorize('coordinador', 'verificador', 'responsable_albergue'),
  (req, res) => ofertaController.getById(req, res)
);

router.put(
  '/:id',
  authenticate,
  authorize('coordinador'),
  (req, res) => ofertaController.update(req, res)
);

router.patch(
  '/:id',
  authenticate,
  authorize('coordinador'),
  (req, res) => ofertaController.update(req, res)
);

router.patch(
  '/:id/estado',
  authenticate,
  authorize('coordinador'),
  (req, res) => ofertaController.updateEstado(req, res)
);

router.delete(
  '/:id',
  authenticate,
  authorize('coordinador'),
  (req, res) => ofertaController.remove(req, res)
);

module.exports = router;
