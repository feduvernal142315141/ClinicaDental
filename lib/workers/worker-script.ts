/**
 * Script del Worker en formato Blob para crear el worker inline
 * Esto evita problemas de CORS y permite usar el worker sin archivos externos
 */

const workerScript = `
let inactivityTimer = null;
let warningTimer = null;

let inactivityTimeMinutes = 15; // Por defecto 15 minutos
let warningTimeMinutes = 13; // Por defecto 13 minutos (advertencia 2 min antes)

const clearTimers = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }
};

const startTimers = () => {
  clearTimers();

  // Timer para mostrar advertencia
  const warningMs = warningTimeMinutes * 60 * 1000;
  warningTimer = setTimeout(() => {
    self.postMessage({ type: 'warning' });
  }, warningMs);

  // Timer para hacer logout automático
  const inactivityMs = inactivityTimeMinutes * 60 * 1000;
  inactivityTimer = setTimeout(() => {
    self.postMessage({ type: 'logout' });
  }, inactivityMs);
};

self.onmessage = function (event) {
  const { type, inactivityTime, warningTime } = event.data;

  switch (type) {
    case 'init':
      if (inactivityTime) {
        inactivityTimeMinutes = inactivityTime;
      }
      if (warningTime) {
        warningTimeMinutes = warningTime;
      }
      startTimers();
      break;

    case 'reset-activity':
      startTimers();
      break;

    case 'logout':
      clearTimers();
      break;

    case 'update-config':
      if (inactivityTime) {
        inactivityTimeMinutes = inactivityTime;
      }
      if (warningTime) {
        warningTimeMinutes = warningTime;
      }
      startTimers();
      break;

    default:
      console.error('Tipo de mensaje no reconocido:', type);
  }
};
`

/**
 * Crea una instancia del worker desde el código inline
 */
export const createInactivityWorker = (): Worker => {
  const blob = new Blob([workerScript], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  return new Worker(workerUrl)
}

export default createInactivityWorker

