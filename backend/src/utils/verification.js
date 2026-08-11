const STAFF_ROLES = ['coordinador', 'verificador'];

function isStaffRole(rol) {
  return STAFF_ROLES.includes(rol);
}

function puntoVerificationError(punto) {
  if (!punto?.verificado) {
    return 'El albergue debe estar verificado para realizar esta operación';
  }
  return null;
}

function necesidadVerificationError(necesidad) {
  if (!necesidad?.verificado) {
    return 'La necesidad debe estar verificada para realizar esta operación';
  }
  return null;
}

module.exports = {
  STAFF_ROLES,
  isStaffRole,
  puntoVerificationError,
  necesidadVerificationError,
};
