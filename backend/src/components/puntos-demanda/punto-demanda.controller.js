const puntoDemandaRepository = require('./punto-demanda.repository');
const { distanceMeters } = require('../../utils/distance');
const { withFreshness, withFreshnessList, withPuntoFreshness, withPuntoFreshnessList } = require('../../utils/freshness');
const {
  sanitizeForViewer,
  sanitizeListForViewer,
} = require('../../utils/privacy');
const { isStaffRole } = require('../../utils/verification');

const VALID_TIPOS = ['oficial', 'autogestionado', 'punto_comunitario'];
const VALID_ESTADOS = ['activo', 'lleno', 'cerrado'];
const DEDUP_DISTANCE_METERS = 150;

class PuntoDemandaController {
  async listPublic(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await puntoDemandaRepository.findAndCountAll({
        municipio: req.query.municipio,
        estado: req.query.estado,
        verificado: this.#isPublicViewer(req) ? true : undefined,
        limit,
        offset,
      });

      const viewerRole = req.user ? req.user.rol : null;
      const data = withPuntoFreshnessList(
        sanitizeListForViewer(result.rows, viewerRole)
      );

      return res.json({
        data,
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing puntos:', error);
      return res.status(500).json({ error: 'Error al listar puntos de demanda' });
    }
  }

  async getByIdPublic(req, res) {
    try {
      const punto = await puntoDemandaRepository.findById(req.params.id);

      if (!punto) {
        return res.status(404).json({ error: 'Punto de demanda no encontrado' });
      }

      if (!punto.verificado && !this.#canViewUnverifiedPunto(req, punto)) {
        return res.status(404).json({ error: 'Punto de demanda no encontrado' });
      }

      const verifiedOnly = this.#filterVerifiedNecesidadesOnly(req, req.params.id);
      const withNeeds = await puntoDemandaRepository.findByIdWithOpenNecesidades(
        req.params.id,
        { verifiedOnly }
      );

      const viewerRole = req.user ? req.user.rol : null;
      const plain = sanitizeForViewer(withNeeds || punto, viewerRole);
      const data = {
        ...withPuntoFreshness(plain, plain.necesidades || []),
        necesidades: withFreshnessList(plain.necesidades || []),
      };

      return res.json({ data });
    } catch (error) {
      console.error('Error fetching punto:', error);
      return res.status(500).json({ error: 'Error al obtener punto de demanda' });
    }
  }

  async create(req, res) {
    try {
      if (req.user && !this.#canCreate(req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const payload = this.#pickWritableFields(req.body, req.user);
      const validationError = this.#validateCreate(payload);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const viewerRole = req.user ? req.user.rol : null;
      const duplicate = await this.#findDuplicate(payload);
      if (duplicate) {
        return res.status(409).json({
          error: 'Posible punto de demanda duplicado',
          data: withPuntoFreshness(sanitizeForViewer(duplicate, viewerRole)),
        });
      }

      const punto = await puntoDemandaRepository.create({
        ...payload,
        ocupacion_actual:
          payload.ocupacion_actual != null ? payload.ocupacion_actual : null,
        estado: payload.estado || 'activo',
        verificado: false,
        actualizado_por: req.user ? req.user.id : null,
      });

      return res.status(201).json({
        data: withPuntoFreshness(sanitizeForViewer(punto, viewerRole)),
      });
    } catch (error) {
      console.error('Error creating punto:', error);
      return res.status(500).json({ error: 'Error al crear punto de demanda' });
    }
  }

  async update(req, res) {
    try {
      const existing = await puntoDemandaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Punto de demanda no encontrado' });
      }

      if (!this.#canModifyPunto(req.user, existing)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const payload = this.#pickWritableFields(req.body, req.user);
      const validationError = this.#validateUpdate(payload);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      if (
        (payload.nombre && payload.nombre !== existing.nombre) ||
        (payload.municipio && payload.municipio !== existing.municipio) ||
        payload.lat !== undefined ||
        payload.lng !== undefined
      ) {
        const candidate = {
          nombre: payload.nombre || existing.nombre,
          municipio: payload.municipio || existing.municipio,
          lat: payload.lat !== undefined ? payload.lat : existing.lat,
          lng: payload.lng !== undefined ? payload.lng : existing.lng,
        };
        const duplicate = await this.#findDuplicate(candidate, existing.id);
        if (duplicate) {
          return res.status(409).json({
            error: 'Posible punto de demanda duplicado',
            data: withPuntoFreshness(
              sanitizeForViewer(duplicate, req.user.rol)
            ),
          });
        }
      }

      const updated = await puntoDemandaRepository.update(req.params.id, {
        ...payload,
        actualizado_por: req.user.id,
      });

      return res.json({
        data: withPuntoFreshness(sanitizeForViewer(updated, req.user.rol)),
      });
    } catch (error) {
      console.error('Error updating punto:', error);
      return res.status(500).json({ error: 'Error al actualizar punto de demanda' });
    }
  }

  async remove(req, res) {
    try {
      const existing = await puntoDemandaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Punto de demanda no encontrado' });
      }

      if (req.user.rol !== 'coordinador') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await puntoDemandaRepository.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting punto:', error);
      return res.status(500).json({ error: 'Error al eliminar punto de demanda' });
    }
  }

  async verify(req, res) {
    try {
      const existing = await puntoDemandaRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Punto de demanda no encontrado' });
      }

      if (!['coordinador', 'verificador'].includes(req.user.rol)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const nextVerified = !existing.verificado;
      const updated = await puntoDemandaRepository.update(req.params.id, {
        verificado: nextVerified,
        verificado_por: nextVerified ? req.user.id : null,
        verificado_en: nextVerified ? new Date() : null,
        actualizado_por: req.user.id,
      });

      return res.json({
        data: withPuntoFreshness(sanitizeForViewer(updated, req.user.rol)),
      });
    } catch (error) {
      console.error('Error verifying punto:', error);
      return res.status(500).json({ error: 'Error al actualizar verificación del punto' });
    }
  }

  #canCreate(user) {
    return ['coordinador', 'responsable_albergue'].includes(user.rol);
  }

  #filterVerifiedNecesidadesOnly(req, puntoId) {
    if (isStaffRole(req.user?.rol)) return false;
    if (
      req.user?.rol === 'responsable_albergue' &&
      req.user.punto_id === puntoId
    ) {
      return false;
    }
    return true;
  }

  #isPublicViewer(req) {
    return !isStaffRole(req.user?.rol);
  }

  #canViewUnverifiedPunto(req, punto) {
    if (isStaffRole(req.user?.rol)) return true;
    if (
      req.user?.rol === 'responsable_albergue' &&
      req.user.punto_id === punto.id
    ) {
      return true;
    }
    return false;
  }

  #canModifyPunto(user, punto) {
    if (user.rol === 'coordinador') return true;
    if (user.rol === 'responsable_albergue') {
      return user.punto_id === punto.id;
    }
    return false;
  }

  #pickWritableFields(body = {}, user = null) {
    const allowed = [
      'nombre',
      'tipo',
      'municipio',
      'lat',
      'lng',
      'direccion',
      'responsable_nombre',
      'responsable_contacto',
      'capacidad',
      'ocupacion_actual',
      'estado',
    ];

    const payload = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        payload[key] = body[key];
      }
    }

    if (
      user?.rol === 'coordinador' &&
      body.censo_afectados_habilitado !== undefined
    ) {
      payload.censo_afectados_habilitado = !!body.censo_afectados_habilitado;
    }

    return payload;
  }

  #validateCreate(payload) {
    if (!payload.nombre || !String(payload.nombre).trim()) {
      return 'El nombre es obligatorio';
    }
    if (!payload.tipo || !VALID_TIPOS.includes(payload.tipo)) {
      return `El tipo es obligatorio y debe ser: ${VALID_TIPOS.join(', ')}`;
    }
    if (!payload.municipio || !String(payload.municipio).trim()) {
      return 'El municipio es obligatorio';
    }
    if (payload.estado && !VALID_ESTADOS.includes(payload.estado)) {
      return `El estado debe ser: ${VALID_ESTADOS.join(', ')}`;
    }
    if (
      payload.capacidad !== undefined &&
      payload.capacidad !== null &&
      Number(payload.capacidad) < 0
    ) {
      return 'La capacidad no puede ser negativa';
    }
    if (
      payload.ocupacion_actual !== undefined &&
      payload.ocupacion_actual !== null &&
      Number(payload.ocupacion_actual) < 0
    ) {
      return 'La ocupación actual no puede ser negativa';
    }
    return null;
  }

  #validateUpdate(payload) {
    if (payload.tipo !== undefined && !VALID_TIPOS.includes(payload.tipo)) {
      return `El tipo debe ser: ${VALID_TIPOS.join(', ')}`;
    }
    if (payload.estado !== undefined && !VALID_ESTADOS.includes(payload.estado)) {
      return `El estado debe ser: ${VALID_ESTADOS.join(', ')}`;
    }
    if (payload.nombre !== undefined && !String(payload.nombre).trim()) {
      return 'El nombre no puede estar vacío';
    }
    if (payload.municipio !== undefined && !String(payload.municipio).trim()) {
      return 'El municipio no puede estar vacío';
    }
    return null;
  }

  async #findDuplicate(candidate, excludeId = null) {
    const byName = await puntoDemandaRepository.findByNombreAndMunicipio(
      candidate.nombre,
      candidate.municipio
    );

    if (byName && byName.id !== excludeId) {
      return byName;
    }

    if (candidate.lat == null || candidate.lng == null) {
      return null;
    }

    const withCoords = await puntoDemandaRepository.findAllWithCoordinates();
    for (const punto of withCoords) {
      if (excludeId && punto.id === excludeId) continue;
      const meters = distanceMeters(
        candidate.lat,
        candidate.lng,
        punto.lat,
        punto.lng
      );
      if (meters <= DEDUP_DISTANCE_METERS) {
        return punto;
      }
    }

    return null;
  }
}

module.exports = new PuntoDemandaController();
