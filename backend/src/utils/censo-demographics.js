const DEMOGRAPHIC_FIELDS = [
  'total_personas',
  'ninos_0_5',
  'ninos_6_17',
  'adultos_hombres',
  'adultos_mujeres',
  'adultos_mayores_60',
  'embarazadas',
  'personas_discapacidad',
  'personas_enfermedad_cronica',
];

function emptyDemographics() {
  return {
    total_personas: 0,
    ninos_0_5: 0,
    ninos_6_17: 0,
    adultos_hombres: 0,
    adultos_mujeres: 0,
    adultos_mayores_60: 0,
    embarazadas: 0,
    personas_discapacidad: 0,
    personas_enfermedad_cronica: 0,
  };
}

function aggregatesFromIntegrantes(integrantes = []) {
  const counts = emptyDemographics();
  counts.total_personas = integrantes.length;

  for (const row of integrantes) {
    switch (row.rango_edad) {
      case '0_5':
        counts.ninos_0_5 += 1;
        break;
      case '6_17':
        counts.ninos_6_17 += 1;
        break;
      case '18_59':
        if (row.sexo === 'femenino') counts.adultos_mujeres += 1;
        else if (row.sexo === 'masculino') counts.adultos_hombres += 1;
        break;
      case '60_mas':
        counts.adultos_mayores_60 += 1;
        break;
      default:
        break;
    }

    switch (row.condicion_especial) {
      case 'embarazo':
        counts.embarazadas += 1;
        break;
      case 'discapacidad':
        counts.personas_discapacidad += 1;
        break;
      case 'enfermedad_cronica':
        counts.personas_enfermedad_cronica += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}

function pickDemographics(payload = {}) {
  const out = {};
  for (const key of DEMOGRAPHIC_FIELDS) {
    if (payload[key] !== undefined && payload[key] !== null) {
      out[key] = Number(payload[key]);
    }
  }
  return out;
}

function validateDemographics(data) {
  for (const key of DEMOGRAPHIC_FIELDS) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (Number(value) < 0) {
      return `${key} no puede ser negativo`;
    }
  }

  if (data.total_personas != null && Number(data.total_personas) < 1) {
    return 'total_personas debe ser al menos 1';
  }

  const ageSum =
    Number(data.ninos_0_5 || 0) +
    Number(data.ninos_6_17 || 0) +
    Number(data.adultos_hombres || 0) +
    Number(data.adultos_mujeres || 0) +
    Number(data.adultos_mayores_60 || 0);

  if (data.total_personas != null && ageSum > Number(data.total_personas)) {
    return 'La suma por edad no puede superar total_personas';
  }

  return null;
}

module.exports = {
  DEMOGRAPHIC_FIELDS,
  emptyDemographics,
  aggregatesFromIntegrantes,
  pickDemographics,
  validateDemographics,
};
