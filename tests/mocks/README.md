# Sistema de Mocks para Email Service

Este directorio contiene un sistema completo de mocks para testing del servicio de email. El sistema está diseñado para ser flexible, fácil de usar y cubrir todos los escenarios de testing posibles.

## Estructura de Archivos

```
tests/mocks/
├── EmailService.mock.js          # Mock principal del EmailService
├── EmailService.helpers.js       # Helpers, factories y utilidades
└── README.md                     # Esta documentación
```

## Componentes Principales

### 1. EmailServiceMock

La clase principal que simula completamente el comportamiento del EmailService real.

**Características principales:**
- ✅ Simula todos los métodos del EmailService real
- ✅ Soporte para configuración dinámica
- ✅ Tracking completo de actividad
- ✅ Rate limiting configurable
- ✅ Sistema de colas simulado
- ✅ Manejo de templates
- ✅ Estadísticas detalladas
- ✅ Eventos y observabilidad

### 2. EmailServiceMockFactory

Factory para crear configuraciones predefinidas del mock.

**Configuraciones disponibles:**
- `createReliable()` - Servicio que nunca falla
- `createSlow()` - Servicio con delays altos
- `createUnstable()` - Servicio con fallos aleatorios
- `createRateLimited()` - Servicio con límites estrictos
- `createPerformanceTest()` - Optimizado para tests de performance
- `createAlwaysFails()` - Servicio que siempre falla
- `createCustom(config)` - Configuración personalizada

### 3. EmailTestDataGenerator

Generador de datos de prueba para diferentes tipos de emails.

**Métodos disponibles:**
- `createValidEmail()` - Email básico válido
- `createMultipleEmails(count)` - Múltiples emails válidos
- `createVariousValidEmails()` - Variedad de formatos válidos
- `createInvalidEmails()` - Emails inválidos para testing
- `createEmailBatch(size)` - Lote de emails para testing masivo
- `createWelcomeEmailData()` - Datos específicos para email de bienvenida
- `createPasswordResetData()` - Datos para reset de contraseña
- `createVerificationData()` - Datos para verificación
- `createNotificationData()` - Datos para notificaciones

### 4. EmailMockAssertions

Assertions específicas para testing de emails.

**Métodos disponibles:**
- `assertEmailSent(service, email)` - Verificar que un email fue enviado
- `assertEmailNotSent(service, criteria)` - Verificar que NO se envió
- `assertStats(service, expectedStats)` - Verificar estadísticas
- `assertMethodCalledWith(service, method, args)` - Verificar llamadas
- `assertResponseTime(service, method, maxTime)` - Verificar tiempos
- `assertQueueSize(service, size)` - Verificar tamaño de cola
- `assertTemplatesLoaded(service, templates)` - Verificar templates
- `assertRateLimitHit(service, type)` - Verificar rate limiting

### 5. EmailScenarioTester

Tester para escenarios complejos y casos de uso avanzados.

**Escenarios disponibles:**
- `simulateHighLoad(count)` - Simular alta carga
- `simulateErrorRecovery()` - Simular recuperación de errores
- `simulateDynamicLimits()` - Simular límites dinámicos
- `simulateQueueProcessing()` - Simular procesamiento de cola
- `simulateTemplateUsage()` - Simular uso de múltiples templates

## Guía de Uso

### Uso Básico

```javascript
const EmailServiceMock = require('./mocks/EmailService.mock');
const { EmailTestDataGenerator } = require('./mocks/EmailService.helpers');

describe('Mi Test Suite', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailServiceMock();
  });

  test('debe enviar email correctamente', async () => {
    const email = EmailTestDataGenerator.createValidEmail();
    const result = await emailService.send(email);
    
    expect(result.success).toBe(true);
    expect(emailService.getSentEmails()).toHaveLength(1);
  });
});
```

### Uso con Factory

```javascript
const { EmailServiceMockFactory } = require('./mocks/EmailService.helpers');

test('servicio lento debe tomar tiempo', async () => {
  const slowService = new EmailServiceMock(
    EmailServiceMockFactory.createSlow({ sendDelay: 100 })
  );
  
  const startTime = Date.now();
  await slowService.send(EmailTestDataGenerator.createValidEmail());
  const duration = Date.now() - startTime;
  
  expect(duration).toBeGreaterThanOrEqual(100);
});
```

### Uso con Assertions

```javascript
const { EmailMockAssertions } = require('./mocks/EmailService.helpers');

test('debe verificar email específico', async () => {
  const email = EmailTestDataGenerator.createValidEmail({
    to: 'specific@example.com',
    subject: 'Specific Test'
  });
  
  await emailService.send(email);
  
  EmailMockAssertions.assertEmailSent(emailService, email);
  EmailMockAssertions.assertStats(emailService, { totalSent: 1 });
});
```

### Uso con Escenarios Complejos

```javascript
const { EmailScenarioTester } = require('./mocks/EmailService.helpers');

test('debe manejar alta carga', async () => {
  const tester = new EmailScenarioTester(emailService);
  const result = await tester.simulateHighLoad(100);
  
  expect(result.successful).toBeGreaterThan(0);
  expect(result.avgTimePerEmail).toBeLessThan(50);
});
```

## Configuración del Mock

### Opciones de Configuración

```javascript
const config = {
  // Control de fallos
  shouldFailSend: false,           // Forzar fallo en envío
  shouldFailInit: false,           // Forzar fallo en inicialización
  shouldFailValidation: false,     // Forzar fallo en validación
  failureRate: 0,                  // Probabilidad de fallo (0-1)
  
  // Control de timing
  sendDelay: 0,                    // Delay en envío (ms)
  initDelay: 0,                    // Delay en inicialización (ms)
  validationDelay: 0,              // Delay en validación (ms)
  
  // Rate limiting
  dailyLimit: null,                // Límite diario de emails
  hourlyLimit: null,               // Límite por hora
  enableRateLimit: true,           // Habilitar rate limiting
  
  // Funcionalidades
  enableTracking: true,            // Habilitar tracking
  enableQueue: true,               // Habilitar sistema de colas
  
  // Templates disponibles
  templates: ['welcome', 'password-reset', 'email-verification', 'notification']
};

const emailService = new EmailServiceMock(config);
```

### Configuración Dinámica

```javascript
// Cambiar configuración en tiempo de ejecución
emailService.configure({ shouldFailSend: true });

// Enviar email (fallará)
await emailService.send(email).catch(error => {
  console.log('Error esperado:', error.message);
});

// Reconfigurar para funcionar
emailService.configure({ shouldFailSend: false });

// Enviar email (funcionará)
await emailService.send(email);
```

## Métodos de Testing y Control

### Obtener Información

```javascript
// Emails enviados
const sentEmails = emailService.getSentEmails();

// Emails fallidos
const failedEmails = emailService.getFailedEmails();

// Emails validados
const validatedEmails = emailService.getValidatedEmails();

// Cola de emails
const queue = emailService.getEmailQueue();

// Estadísticas
const stats = emailService.getStats();

// Historial de llamadas
const history = emailService.getCallHistory();
```

### Verificar Actividad

```javascript
// Verificar si un método fue llamado
const wasCalled = emailService.wasMethodCalled('send');

// Obtener contador de llamadas
const callCount = emailService.getCallCount('send');

// Obtener argumentos de la última llamada
const lastArgs = emailService.getLastCallArgs('send');
```

### Limpiar Estado

```javascript
// Limpiar todo el estado del mock
emailService.reset();

// El mock queda como recién creado
expect(emailService.getSentEmails()).toHaveLength(0);
expect(emailService.getCallCount()).toBe(0);
```

## Patrones de Testing Recomendados

### 1. Setup y Teardown

```javascript
describe('Email Tests', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailServiceMock(
      EmailServiceMockFactory.createReliable()
    );
  });

  afterEach(() => {
    emailService.reset();
  });

  // Tests...
});
```

### 2. Testing de Retry Logic

```javascript
test('debe reintentar en caso de fallo', async () => {
  emailService.configure({ failureRate: 0.7 }); // 70% de fallo

  let attempts = 0;
  let success = false;
  const maxAttempts = 5;

  while (!success && attempts < maxAttempts) {
    attempts++;
    try {
      await emailService.send(email);
      success = true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  expect(attempts).toBeGreaterThan(1);
  expect(emailService.getCallCount('send')).toBe(attempts);
});
```

### 3. Testing de Circuit Breaker

```javascript
test('debe abrir circuit breaker después de fallos consecutivos', async () => {
  emailService.configure({ shouldFailSend: true });
  
  let circuitOpen = false;
  let consecutiveFailures = 0;
  const maxFailures = 3;

  for (let i = 0; i < 5; i++) {
    if (circuitOpen) break;

    try {
      await emailService.send(EmailTestDataGenerator.createValidEmail());
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures++;
      if (consecutiveFailures >= maxFailures) {
        circuitOpen = true;
      }
    }
  }

  expect(circuitOpen).toBe(true);
  expect(emailService.getCallCount('send')).toBe(maxFailures);
});
```

### 4. Testing de Rate Limiting

```javascript
test('debe respetar rate limiting', async () => {
  emailService.configure({ dailyLimit: 3, enableRateLimit: true });
  
  const emails = EmailTestDataGenerator.createMultipleEmails(5);
  const results = [];
  const rateLimitErrors = [];

  for (const email of emails) {
    try {
      const result = await emailService.send(email);
      results.push(result);
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        rateLimitErrors.push(error);
      }
    }
  }

  expect(results.length).toBe(3);
  expect(rateLimitErrors.length).toBe(2);
});
```

### 5. Testing de Fallback

```javascript
test('debe usar servicio de fallback', async () => {
  const primaryService = new EmailServiceMock({ shouldFailSend: true });
  const fallbackService = new EmailServiceMock();

  let result;
  try {
    result = await primaryService.send(email);
  } catch (primaryError) {
    result = await fallbackService.send(email);
  }

  expect(result.success).toBe(true);
  expect(primaryService.getCallCount('send')).toBe(1);
  expect(fallbackService.getCallCount('send')).toBe(1);
});
```

## Integración con Jest

### Mocking del Servicio Real

```javascript
// Mock del módulo real
jest.mock('../../services/emailService', () => ({
  getEmailService: jest.fn()
}));

const { getEmailService } = require('../../services/emailService');

beforeEach(() => {
  const emailServiceMock = new EmailServiceMock();
  getEmailService.mockResolvedValue(emailServiceMock);
});
```

### Dependency Injection

```javascript
test('debe funcionar con dependency injection', async () => {
  class NotificationService {
    constructor(emailService) {
      this.emailService = emailService;
    }

    async sendWelcomeEmail(user) {
      return this.emailService.send({
        to: user.email,
        subject: 'Welcome!',
        template: 'welcome',
        data: { userName: user.name }
      });
    }
  }

  const emailMock = new EmailServiceMock();
  const notificationService = new NotificationService(emailMock);

  const user = { name: 'John', email: 'john@example.com' };
  await notificationService.sendWelcomeEmail(user);

  EmailMockAssertions.assertEmailSent(emailMock, {
    to: user.email,
    subject: 'Welcome!'
  });
});
```

## Mejores Prácticas

### 1. Usa Configuraciones Predefinidas
```javascript
// ✅ Bueno - Usa factory para configuraciones comunes
const service = new EmailServiceMock(EmailServiceMockFactory.createReliable());

// ❌ Malo - Configuración manual repetitiva
const service = new EmailServiceMock({
  shouldFailSend: false,
  shouldFailInit: false,
  failureRate: 0,
  enableTracking: true
});
```

### 2. Usa Generadores de Datos
```javascript
// ✅ Bueno - Usa generador
const email = EmailTestDataGenerator.createValidEmail();

// ❌ Malo - Datos hardcodeados
const email = {
  to: 'test@example.com',
  subject: 'Test',
  text: 'Test message'
};
```

### 3. Usa Assertions Específicas
```javascript
// ✅ Bueno - Assertion específica
EmailMockAssertions.assertEmailSent(service, email);

// ❌ Malo - Verificación manual
const sentEmails = service.getSentEmails();
expect(sentEmails.some(e => e.to === email.to)).toBe(true);
```

### 4. Limpia Estado Entre Tests
```javascript
// ✅ Bueno - Limpieza automática
afterEach(() => {
  emailService.reset();
});

// ❌ Malo - Estado persistente entre tests
```

### 5. Usa Escenarios para Tests Complejos
```javascript
// ✅ Bueno - Usa scenario tester
const tester = new EmailScenarioTester(service);
const result = await tester.simulateHighLoad(100);

// ❌ Malo - Lógica compleja inline en el test
```

## Ejemplos Completos

Ver `tests/examples/EmailService.examples.test.js` para ejemplos completos de uso en diferentes escenarios.

## Troubleshooting

### Problema: Mock no se comporta como esperado
**Solución**: Verifica la configuración y usa `emailService.getCallHistory()` para debuggear.

### Problema: Tests intermitentes con servicios inestables
**Solución**: Usa seeds fijos para `Math.random()` o configura `failureRate` específico.

### Problema: Performance lenta en tests
**Solución**: Usa `EmailServiceMockFactory.createPerformanceTest()` y evita delays innecesarios.

### Problema: Assertions fallan
**Solución**: Verifica que estés usando los métodos correctos y que el mock esté configurado apropiadamente.

## Contribuir

Para agregar nuevas funcionalidades al sistema de mocks:

1. Agrega el método al `EmailServiceMock`
2. Crea helpers correspondientes si es necesario
3. Agrega tests unitarios
4. Actualiza esta documentación
5. Agrega ejemplos de uso

## Licencia

Este sistema de mocks es parte del proyecto CRUD y sigue la misma licencia.

