const afectadoRepository = require('./afectado.repository');
const puntoDemandaRepository = require('../puntos-demanda/punto-demanda.repository');
const { withFreshness, withFreshnessList } = require('../../utils/freshness');
const {
  aggregatesFromIntegrantes,
  pickDemographics,
  validateDemographics,
} = require('../../utils/censo-demographics');
const {
  TIPOS_REGISTRO,
  MODOS_REGISTRO,
  VIVIENDA_ESTADOS,
  MOTIVOS_PRINCIPALES,
  SITUACIONES_ACTUALES,
  PRIORIDADES,
  ESTADOS_REGISTRO,
  FUENTES,
  ROLES_EN_HOGAR,
  RANGOS_EDAD,
  SEXOS,
  CONDICIONES_ESPECIALES,
} = require('../../constants/censo-afectados');

const PRIVATE_FIELDS = ['telefono_contacto'];

function toPlain(record) {
  return record && typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
}

function sanitizeForViewer(record, viewer, captadorPuntoId) {
  const plain = toPlain(record);
  if (Array.isArray(plain.integrantes)) {
    plain.integrantes = plain.integrantes.map((row) => {
      const member = { ...row };
      if (!canViewContact(viewer, captadorPuntoId)) {
        delete member.nombre;
      }
      return member;
    });
  }

  if (!canViewContact(viewer, captadorPuntoId)) {
    for (const field of PRIVATE_FIELDS) {
      delete plain[field];
    }
  }

  return plain;
}

function canViewContact(viewer, captadorPuntoId) {
  if (!viewer) return false;
  if (viewer.rol === 'coordinador' || viewer.rol === 'verificador') return true;
  if (viewer.rol === 'responsable_albergue' && viewer.punto_id === captadorPuntoId) {
    return true;
  }
  return false;
}

class AfectadoController {
  async listByPunto(req, res) {
    try {
      const { puntoId } = req.params;
      if (!(await this.#ensureCensoAccess(req, res, puntoId))) return;

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await afectadoRepository.findAndCount({
        registrado_por_punto_id: puntoId,
        municipio: req.query.municipio,
        situacion_actual: req.query.situacion_actual,
        estado_registro: req.query.estado_registro || undefined,
        en_albergue:
          req.query.en_albergue === 'true'
            ? true
            : req.query.en_albergue === 'false'
              ? false
              : undefined,
        limit,
        offset,
      });

      const data = withFreshnessList(
        result.rows.map((row) =>
          sanitizeForViewer(row, req.user, row.registrado_por_punto_id)
        )
      );

      return res.json({
        data,
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing afectados by punto:', error);
      return res.status(500).json({ error: 'Error al listar afectados' });
    }
  }

  async listOpen(req, res) {
    try {
      if (!['coordinador', 'verificador'].includes(req.user.rol)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await afectadoRepository.findAndCount({
        municipio: req.query.municipio,
        situacion_actual: req.query.situacion_actual,
        estado_registro: req.query.estado_registro,
        registrado_por_punto_id: req.query.punto_id,
        en_albergue:
          req.query.en_albergue === 'true'
            ? true
            : req.query.en_albergue === 'false'
              ? false
              : undefined,
        limit,
        offset,
      });

      const data = withFreshnessList(
        result.rows.map((row) =>
          sanitizeForViewer(row, req.user, row.registrado_por_punto_id)
        )
      );

      return res.json({
        data,
        total: result.count,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing afectados:', error);
      return res.status(500).json({ error: 'Error al listar afectados' });
    }
  }

  async reporte(req, res) {
    try {
      const filters = this.#buildReporteFilters(req);
      if (filters.error) {
        return res.status(filters.status).json({ error: filters.error });
      }

      const data = await afectadoRepository.getReporteStats(filters.payload);
      return res.json({ data });
    } catch (error) {
      console.error('Error generating censo reporte:', error);
      return res.status(500).json({ error: 'Error al generar reporte de censo' });
    }
  }

  async reporteByPunto(req, res) {
    try {
      const { puntoId } = req.params;
      if (!(await this.#ensureCensoAccess(req, res, puntoId))) return;

      const data = await afectadoRepository.getReporteStats({
        registrado_por_punto_id: puntoId,
        municipio: req.query.municipio,
        estado_registro: req.query.estado_registro || 'activo',
      });

      return res.json({ data });
    } catch (error) {
      console.error('Error generating censo reporte by punto:', error);
      return res.status(500).json({ error: 'Error al generar reporte de censo' });
    }
  }

  async getById(req, res) {
    try {
      const { puntoId, id } = req.params;
      if (!(await this.#ensureCensoAccess(req, res, puntoId))) return;

      const row = await afectadoRepository.findByIdAndPuntoId(id, puntoId);
      if (!row) {
        return res.status(404).json({ error: 'Registro de afectado no encontrado' });
      }

      return res.json({
        data: withFreshness(sanitizeForViewer(row, req.user, puntoId)),
      });
    } catch (error) {
      console.error('Error fetching afectado:', error);
      return res.status(500).json({ error: 'Error al obtener afectado' });
    }
  }

  async create(req, res) {
    try {
      const { puntoId } = req.params;
      const punto = await this.#ensureCensoAccess(req, res, puntoId);
      if (!punto) return;

      const parsed = this.#parsePayload(req.body);
      const validationError = this.#validatePayload(parsed, { isCreate: true });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const situacionError = await this.#validateSituacion(
        parsed.payload,
        parsed.integrantes
      );
      if (situacionError) {
        return res.status(400).json({ error: situacionError });
      }

      if (!parsed.payload.consentimiento_registro) {
        return res.status(400).json({
          error: 'Se requiere consentimiento para registrar el censo',
        });
      }

      const afectadoData = {
        ...parsed.payload,
        registrado_por_punto_id: puntoId,
        registrado_por_usuario_id: req.user.id,
        consentimiento_en: new Date(),
        ultima_verificacion: new Date(),
      };

      const created = await afectadoRepository.createWithIntegrantes(
        afectadoData,
        parsed.integrantes
      );

      return res.status(201).json({
        data: withFreshness(sanitizeForViewer(created, req.user, puntoId)),
      });
    } catch (error) {
      console.error('Error creating afectado:', error);
      return res.status(500).json({ error: 'Error al registrar afectado' });
    }
  }

  async update(req, res) {
    try {
      const { puntoId, id } = req.params;
      if (!(await this.#ensureCensoAccess(req, res, puntoId))) return;

      const existing = await afectadoRepository.findByIdAndPuntoId(id, puntoId);
      if (!existing) {
        return res.status(404).json({ error: 'Registro de afectado no encontrado' });
      }

      const parsed = this.#parsePayload(req.body, existing);
      const validationError = this.#validatePayload(parsed, { isCreate: false });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const situacionError = await this.#validateSituacion(
        { ...toPlain(existing), ...parsed.payload },
        parsed.integrantes !== null
          ? parsed.integrantes
          : existing.integrantes?.map((row) => toPlain(row)) || []
      );
      if (situacionError) {
        return res.status(400).json({ error: situacionError });
      }

      const updateData = {
        ...parsed.payload,
        ultima_verificacion: new Date(),
      };

      const updated = await afectadoRepository.updateWithIntegrantes(
        id,
        updateData,
        parsed.integrantes
      );

      return res.json({
        data: withFreshness(sanitizeForViewer(updated, req.user, puntoId)),
      });
    } catch (error) {
      console.error('Error updating afectado:', error);
      return res.status(500).json({ error: 'Error al actualizar afectado' });
    }
  }

  async remove(req, res) {
    try {
      const { puntoId, id } = req.params;
      if (!(await this.#ensureCensoAccess(req, res, puntoId))) return;

      const existing = await afectadoRepository.findByIdAndPuntoId(id, puntoId);
      if (!existing) {
        return res.status(404).json({ error: 'Registro de afectado no encontrado' });
      }

      await afectadoRepository.delete(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting afectado:', error);
      return res.status(500).json({ error: 'Error al eliminar afectado' });
    }
  }

  async #ensureCensoAccess(req, res, puntoId) {
    const punto = await puntoDemandaRepository.findById(puntoId);
    if (!punto) {
      res.status(404).json({ error: 'Punto de demanda no encontrado' });
      return null;
    }

    if (!punto.censo_afectados_habilitado) {
      res.status(403).json({
        error: 'El censo de afectados no está habilitado para este albergue',
      });
      return null;
    }

    if (req.user.rol === 'coordinador' || req.user.rol === 'verificador') {
      return punto;
    }

    if (
      req.user.rol === 'responsable_albergue' &&
      req.user.punto_id === puntoId
    ) {
      return punto;
    }

    res.status(403).json({ error: 'No autorizado' });
    return null;
  }

  #parsePayload(body = {}, existing = null) {
    const payload = this.#pickWritableFields(body);
    const modo =
      payload.modo_registro ||
      existing?.modo_registro ||
      body.modo_registro ||
      'agregado';

    payload.modo_registro = modo;

    let integrantes = null;
    if (modo === 'detallado') {
      if (Array.isArray(body.integrantes)) {
        integrantes = body.integrantes.map((row, index) =>
          this.#pickIntegranteFields(row, index)
        );
      } else if (!existing) {
        integrantes = [];
      }
    } else {
      integrantes = [];
      Object.assign(payload, pickDemographics(body));
    }

    if (modo === 'detallado' && integrantes !== null) {
      Object.assign(payload, aggregatesFromIntegrantes(integrantes));
    }

    if (payload.consentimiento_registro === undefined && existing) {
      delete payload.consentimiento_registro;
    }

    if (payload.necesidades === undefined && existing) {
      delete payload.necesidades;
    } else if (!Array.isArray(payload.necesidades)) {
      payload.necesidades = payload.necesidades ? [String(payload.necesidades)] : [];
    }

    return { payload, integrantes, modo_registro: modo };
  }

  #pickWritableFields(body = {}) {
    const allowed = [
      'tipo_registro',
      'modo_registro',
      'nombre_referencia',
      'telefono_contacto',
      'municipio',
      'vereda_barrio',
      'direccion_aproximada',
      'vivienda_estado',
      'desplazado',
      'motivo_principal',
      'situacion_actual',
      'punto_acogida_id',
      'municipio_ubicacion_actual',
      'ubicacion_texto',
      'necesidades',
      'prioridad',
      'observaciones',
      'estado_registro',
      'fuente',
      'consentimiento_registro',
    ];

    const payload = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        payload[key] = body[key];
      }
    }

    if (payload.municipio !== undefined) {
      payload.municipio = String(payload.municipio).trim();
    }
    if (payload.vereda_barrio !== undefined && payload.vereda_barrio !== null) {
      payload.vereda_barrio = String(payload.vereda_barrio).trim();
    }
    if (
      payload.direccion_aproximada !== undefined &&
      payload.direccion_aproximada !== null
    ) {
      payload.direccion_aproximada = String(payload.direccion_aproximada).trim();
    }
    if (
      payload.municipio_ubicacion_actual !== undefined &&
      payload.municipio_ubicacion_actual !== null
    ) {
      payload.municipio_ubicacion_actual = String(
        payload.municipio_ubicacion_actual
      ).trim();
    }
    if (payload.ubicacion_texto !== undefined && payload.ubicacion_texto !== null) {
      payload.ubicacion_texto = String(payload.ubicacion_texto).trim();
    }
    if (
      payload.nombre_referencia !== undefined &&
      payload.nombre_referencia !== null
    ) {
      payload.nombre_referencia = String(payload.nombre_referencia).trim();
    }
    if (
      payload.telefono_contacto !== undefined &&
      payload.telefono_contacto !== null
    ) {
      payload.telefono_contacto = String(payload.telefono_contacto).trim();
    }

    return payload;
  }

  #pickIntegranteFields(row = {}, index = 0) {
    return {
      rol_en_hogar: row.rol_en_hogar || 'otro',
      rango_edad: row.rango_edad,
      sexo: row.sexo || null,
      condicion_especial: row.condicion_especial || 'ninguna',
      nombre: row.nombre ? String(row.nombre).trim() : null,
      observaciones: row.observaciones ? String(row.observaciones).trim() : null,
      orden: row.orden != null ? Number(row.orden) : index,
    };
  }

  #validatePayload(parsed, { isCreate }) {
    const { payload, integrantes, modo_registro } = parsed;

    if (isCreate && !payload.municipio) {
      return 'El municipio es obligatorio';
    }
    if (payload.tipo_registro && !TIPOS_REGISTRO.includes(payload.tipo_registro)) {
      return 'tipo_registro inválido';
    }
    if (modo_registro && !MODOS_REGISTRO.includes(modo_registro)) {
      return 'modo_registro inválido';
    }
    if (
      payload.vivienda_estado &&
      !VIVIENDA_ESTADOS.includes(payload.vivienda_estado)
    ) {
      return 'vivienda_estado inválido';
    }
    if (
      payload.motivo_principal &&
      !MOTIVOS_PRINCIPALES.includes(payload.motivo_principal)
    ) {
      return 'motivo_principal inválido';
    }
    if (
      payload.situacion_actual &&
      !SITUACIONES_ACTUALES.includes(payload.situacion_actual)
    ) {
      return 'situacion_actual inválida';
    }
    if (payload.prioridad && !PRIORIDADES.includes(payload.prioridad)) {
      return 'prioridad inválida';
    }
    if (
      payload.estado_registro &&
      !ESTADOS_REGISTRO.includes(payload.estado_registro)
    ) {
      return 'estado_registro inválido';
    }
    if (payload.fuente && !FUENTES.includes(payload.fuente)) {
      return 'fuente inválida';
    }

    const demoError = validateDemographics(payload);
    if (demoError) return demoError;

    if (modo_registro === 'agregado') {
      if (isCreate && (payload.total_personas == null || payload.total_personas < 1)) {
        return 'total_personas debe ser al menos 1 en modo agregado';
      }
    }

    if (modo_registro === 'detallado') {
      if (integrantes === null && isCreate) {
        return 'integrantes es obligatorio en modo detallado';
      }
      if (integrantes !== null) {
        if (integrantes.length === 0) {
          return 'Debe registrar al menos un integrante en modo detallado';
        }
        for (const row of integrantes) {
          const err = this.#validateIntegrante(row);
          if (err) return err;
        }
      }
    }

    return null;
  }

  #validateIntegrante(row) {
    if (!row.rango_edad || !RANGOS_EDAD.includes(row.rango_edad)) {
      return 'Cada integrante debe tener un rango_edad válido';
    }
    if (row.rol_en_hogar && !ROLES_EN_HOGAR.includes(row.rol_en_hogar)) {
      return 'rol_en_hogar inválido';
    }
    if (row.sexo && !SEXOS.includes(row.sexo)) {
      return 'sexo inválido';
    }
    if (
      row.condicion_especial &&
      !CONDICIONES_ESPECIALES.includes(row.condicion_especial)
    ) {
      return 'condicion_especial inválida';
    }
    if (row.rango_edad === '18_59' && !row.sexo) {
      return 'Indica sexo para integrantes entre 18 y 59 años';
    }
    return null;
  }

  async #validateSituacion(payload, integrantes) {
    if (payload.situacion_actual === 'en_albergue') {
      if (!payload.punto_acogida_id) {
        return 'Indica el albergue de acogida (punto_acogida_id)';
      }
      const punto = await puntoDemandaRepository.findById(payload.punto_acogida_id);
      if (!punto) {
        return 'Albergue de acogida no encontrado';
      }
    }

    if (
      payload.situacion_actual !== 'en_albergue' &&
      payload.punto_acogida_id
    ) {
      return 'punto_acogida_id solo aplica cuando situacion_actual es en_albergue';
    }

    if (payload.tipo_registro === 'persona_sola') {
      const total = payload.total_personas;
      if (total != null && Number(total) !== 1) {
        return 'persona_sola debe tener total_personas = 1';
      }
      if (integrantes && integrantes.length > 1) {
        return 'persona_sola admite máximo un integrante en modo detallado';
      }
    }

    return null;
  }

  #buildReporteFilters(req) {
    const viewer = req.user;
    const payload = {
      municipio: req.query.municipio,
      estado_registro: req.query.estado_registro || 'activo',
    };

    if (viewer.rol === 'responsable_albergue') {
      if (!viewer.punto_id) {
        return { error: 'Usuario sin albergue asignado', status: 403 };
      }
      payload.registrado_por_punto_id = viewer.punto_id;
      return { payload };
    }

    if (!['coordinador', 'verificador'].includes(viewer.rol)) {
      return { error: 'No autorizado', status: 403 };
    }

    if (req.query.punto_id) {
      payload.registrado_por_punto_id = req.query.punto_id;
    }

    return { payload };
  }
}

module.exports = new AfectadoController();
