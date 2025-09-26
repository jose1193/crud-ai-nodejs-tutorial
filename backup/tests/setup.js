/**
 * Setup global para todos los tests
 */

// Variables de entorno para testing
process.env.NODE_ENV = "test";
process.env.PORT = 3001;
process.env.EMAIL_DEV_SAVE_FILE = "true";
process.env.FORCE_EMAIL_SEND = "false";

// Mock console.log para tests más limpios (opcional)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Solo mostrar errores en tests
console.log = jest.fn();
console.warn = jest.fn();
console.error = originalConsoleError;

// Restaurar console después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Limpiar todos los mocks después de todos los tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Timeout global para tests
jest.setTimeout(10000);
