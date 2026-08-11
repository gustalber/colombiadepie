const necesidadRepository = require('./necesidad.repository');
const puntoDemandaRepository = require('../puntos-demanda/punto-demanda.repository');
const { withFreshness, withFreshnessList } = require('../../utils/freshness');
const { sanitizeForViewer } = require('../../utils/privacy');
const { puntoVerificationError } = require('../../utils/verification');

const { CATEGORIAS: VALID_CATEGORIAS } = require('../../constants/categorias');
const VALID_URGENCIAS = ['alta', 'media', 'baja'];
const VALID_ESTADOS = ['abierta', 'en_camino', 'cubierta'];

class NecesidadController {
  async listOpen(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      if (req.query.categoria && !VALID_CATEGORIAS.includes(req.query.categoria)) {
        return res.status(400).json({ error: 'Categoría inválida' });
      }
      if (req.query.estado && !VALID_ESTADOS.includes(req.query.estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const result = await necesidadRepository.findAndCountOpen({
        estado: req.query.estado || 'abierta',
        categoria: req.query.categoria,
        municipio: req.query.municipio
          ? String(req.query.municipio).trim()
          : undefined,
        urgencia: req.query.urgencia,
        verificado: true,
        limit,
        offset,
      });

      const viewerRole = req.user ? req.user.rol : null;
      const data = withFreshnessList(result.rows).map((row) => {
        if (!row.punto) return row;
        return {
          ...row,
          punto: sanitizeForViewer(row.punto, viewerRole),
        };
      });

      return res.json({
        data,
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing open necesidades:', error);
      return res.status(500).json({ error: 'Error al listar necesidades' });
    }
  }

  async listByPunto(req, res) {
    try {
      const { puntoId } = req.params;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canAccessPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await necesidadRepository.findAndCountByPuntoId(puntoId, {
        estado: req.query.estado,
        categoria: req.query.categoria,
        urgencia: req.query.urgencia,
        limit,
        offset,
      });

      return res.json({
        data: withFreshnessList(result.rows),
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing necesidades:', error);
      return res.status(500).json({ error: 'Error al listar necesidades' });
    }
  }

  async getById(req, res) {
    try {
      const { puntoId, id } = req.params;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canAccessPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const necesidad = await necesidadRepository.findByIdAndPuntoId(id, puntoId);
      if (!necesidad) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      return res.json({ data: withFreshness(necesidad) });
    } catch (error) {
      console.error('Error fetching necesidad:', error);
      return res.status(500).json({ error: 'Error al obtener necesidad' });
    }
  }

  async create(req, res) {
    try {
      const { puntoId } = req.params;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canModifyPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const punto = await puntoDemandaRepository.findById(puntoId);
      const puntoError = puntoVerificationError(punto);
      if (puntoError) {
        return res.status(409).json({ error: puntoError });
      }

      const payload = this.#pickWritableFields(req.body);
      const validationError = this.#validateCreate(payload);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const necesidad = await necesidadRepository.create({
        ...payload,
        punto_id: puntoId,
        urgencia: payload.urgencia || 'media',
        estado: payload.estado || 'abierta',
        verificado: true,
        verificado_por: req.user.id,
        verificado_en: new Date(),
        cantidad_solicitada:
          payload.cantidad_solicitada != null
            ? payload.cantidad_solicitada
            : payload.cantidad != null
              ? payload.cantidad
              : null,
      });

      return res.status(201).json({ data: withFreshness(necesidad) });
    } catch (error) {
      console.error('Error creating necesidad:', error);
      return res.status(500).json({ error: 'Error al crear necesidad' });
    }
  }

  async update(req, res) {
    try {
      const { puntoId, id } = req.params;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canModifyPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const existing = await necesidadRepository.findByIdAndPuntoId(id, puntoId);
      if (!existing) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      const payload = this.#pickWritableFields(req.body);
      const validationError = this.#validateUpdate(payload);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const updated = await necesidadRepository.update(id, payload);
      return res.json({ data: withFreshness(updated) });
    } catch (error) {
      console.error('Error updating necesidad:', error);
      return res.status(500).json({ error: 'Error al actualizar necesidad' });
    }
  }

  async updateEstado(req, res) {
    try {
      const { puntoId, id } = req.params;
      const { estado } = req.body;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canModifyPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (!estado || !VALID_ESTADOS.includes(estado)) {
        return res.status(400).json({
          error: `El estado debe ser: ${VALID_ESTADOS.join(', ')}`,
        });
      }

      const existing = await necesidadRepository.findByIdAndPuntoId(id, puntoId);
      if (!existing) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      const updated = await necesidadRepository.update(id, { estado });
      return res.json({ data: withFreshness(updated) });
    } catch (error) {
      console.error('Error updating necesidad estado:', error);
      return res.status(500).json({ error: 'Error al actualizar estado de necesidad' });
    }
  }

  async remove(req, res) {
    try {
      const { puntoId, id } = req.params;

      if (!(await this.#ensurePuntoExists(puntoId, res))) return;
      if (!this.#canModifyPunto(req.user, puntoId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const existing = await necesidadRepository.findByIdAndPuntoId(id, puntoId);
      if (!existing) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      await necesidadRepository.delete(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting necesidad:', error);
      return res.status(500).json({ error: 'Error al eliminar necesidad' });
    }
  }

  async verify(req, res) {
    try {
      if (!['coordinador', 'verificador'].includes(req.user.rol)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const existing = await necesidadRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Necesidad no encontrada' });
      }

      const punto = await puntoDemandaRepository.findById(existing.punto_id);
      const puntoError = puntoVerificationError(punto);
      if (puntoError) {
        return res.status(409).json({ error: puntoError });
      }

      const updated = await necesidadRepository.update(req.params.id, {
        verificado: true,
        verificado_por: req.user.id,
        verificado_en: new Date(),
      });

      return res.json({ data: withFreshness(updated) });
    } catch (error) {
      console.error('Error verifying necesidad:', error);
      return res.status(500).json({ error: 'Error al verificar necesidad' });
    }
  }

  async #ensurePuntoExists(puntoId, res) {
    const punto = await puntoDemandaRepository.findById(puntoId);
    if (!punto) {
      res.status(404).json({ error: 'Punto de demanda no encontrado' });
      return false;
    }
    return true;
  }

  #canAccessPunto(user, puntoId) {
    if (['coordinador', 'verificador'].includes(user.rol)) return true;
    if (user.rol === 'responsable_albergue') {
      return user.punto_id === puntoId;
    }
    return false;
  }

  #canModifyPunto(user, puntoId) {
    if (user.rol === 'coordinador') return true;
    if (user.rol === 'responsable_albergue') {
      return user.punto_id === puntoId;
    }
    return false;
  }

  #pickWritableFields(body = {}) {
    const allowed = [
      'categoria',
      'descripcion',
      'cantidad',
      'cantidad_solicitada',
      'unidad',
      'urgencia',
      'estado',
    ];

    const payload = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        payload[key] = body[key];
      }
    }
    return payload;
  }

  #validateCreate(payload) {
    if (!payload.categoria || !VALID_CATEGORIAS.includes(payload.categoria)) {
      return `La categoría es obligatoria y debe ser: ${VALID_CATEGORIAS.join(', ')}`;
    }
    if (payload.urgencia && !VALID_URGENCIAS.includes(payload.urgencia)) {
      return `La urgencia debe ser: ${VALID_URGENCIAS.join(', ')}`;
    }
    if (payload.estado && !VALID_ESTADOS.includes(payload.estado)) {
      return `El estado debe ser: ${VALID_ESTADOS.join(', ')}`;
    }
    if (
      payload.cantidad !== undefined &&
      payload.cantidad !== null &&
      Number(payload.cantidad) < 0
    ) {
      return 'La cantidad no puede ser negativa';
    }
    if (
      payload.cantidad_solicitada !== undefined &&
      payload.cantidad_solicitada !== null &&
      Number(payload.cantidad_solicitada) < 0
    ) {
      return 'La cantidad solicitada no puede ser negativa';
    }
    return null;
  }

  #validateUpdate(payload) {
    if (
      payload.categoria !== undefined &&
      !VALID_CATEGORIAS.includes(payload.categoria)
    ) {
      return `La categoría debe ser: ${VALID_CATEGORIAS.join(', ')}`;
    }
    if (
      payload.urgencia !== undefined &&
      !VALID_URGENCIAS.includes(payload.urgencia)
    ) {
      return `La urgencia debe ser: ${VALID_URGENCIAS.join(', ')}`;
    }
    if (payload.estado !== undefined && !VALID_ESTADOS.includes(payload.estado)) {
      return `El estado debe ser: ${VALID_ESTADOS.join(', ')}`;
    }
    if (
      payload.cantidad !== undefined &&
      payload.cantidad !== null &&
      Number(payload.cantidad) < 0
    ) {
      return 'La cantidad no puede ser negativa';
    }
    if (
      payload.cantidad_solicitada !== undefined &&
      payload.cantidad_solicitada !== null &&
      Number(payload.cantidad_solicitada) < 0
    ) {
      return 'La cantidad solicitada no puede ser negativa';
    }
    return null;
  }
}

module.exports = new NecesidadController();
