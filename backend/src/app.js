const express = require('express');
const cors = require('cors');
require('./models');

const puntoDemandaRoutes = require('./components/puntos-demanda/punto-demanda.routes');
const { rootRouter: necesidadRootRoutes } = require('./components/necesidades/necesidad.routes');
const ofertaRoutes = require('./components/ofertas/oferta.routes');
const emparejamientoRoutes = require('./components/emparejamientos/emparejamiento.routes');
const authRoutes = require('./components/auth/auth.routes');
const usuarioRoutes = require('./components/usuarios/usuario.routes');
const { rootRouter: afectadoRootRoutes } = require('./components/afectados/afectado.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/auth', authRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/puntos', puntoDemandaRoutes);
app.use('/necesidades', necesidadRootRoutes);
app.use('/afectados', afectadoRootRoutes);
app.use('/ofertas', ofertaRoutes);
app.use('/emparejamientos', emparejamientoRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
