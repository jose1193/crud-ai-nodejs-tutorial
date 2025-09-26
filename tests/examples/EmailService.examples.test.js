/**
 * Ejemplos de uso del EmailServiceMock y sus utilidades
 * Este archivo demuestra diferentes patrones y casos de uso para testing de servicios de email
 *
 * NOTA: Este archivo contiene ejemplos prácticos de cómo usar los mocks de email
 * para diferentes escenarios de testing. Úsalo como referencia para crear tus propios tests.
 */

const EmailServiceMock = require("../mocks/EmailService.mock");
const {
  EmailServiceMockFactory,
  EmailTestDataGenerator,
  EmailMockAssertions,
  EmailScenarioTester,
} = require("../mocks/EmailService.helpers");

describe("Ejemplos de uso del EmailServiceMock", () => {
  describe("Configuraciones predefinidas", () => {
    test("Ejemplo: Servicio confiable para tests básicos", async () => {
      // Crear un servicio que nunca falla
      const reliableService = new EmailServiceMock(
        EmailServiceMockFactory.createReliable()
      );

      const email = EmailTestDataGenerator.createValidEmail();
      const result = await reliableService.send(email);

      expect(result.success).toBe(true);
      EmailMockAssertions.assertEmailSent(reliableService, email);
    });

    test("Ejemplo: Servicio lento para tests de timeout", async () => {
      // Crear un servicio con delays altos
      const slowService = new EmailServiceMock(
        EmailServiceMockFactory.createSlow({ sendDelay: 100 })
      );

      const startTime = Date.now();
      await slowService.send(EmailTestDataGenerator.createValidEmail());
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    test("Ejemplo: Servicio inestable para tests de resilencia", async () => {
      // Crear un servicio con fallos aleatorios
      const unstableService = new EmailServiceMock(
        EmailServiceMockFactory.createUnstable({ failureRate: 0.5 })
      );

      const results = [];
      const errors = [];

      // Intentar múltiples envíos
      for (let i = 0; i < 10; i++) {
        try {
          const result = await unstableService.send(
            EmailTestDataGenerator.createValidEmail({
              to: `test${i}@example.com`,
            })
          );
          results.push(result);
        } catch (error) {
          errors.push(error);
        }
      }

      // Con 50% de fallo, deberían haber algunos errores
      expect(errors.length).toBeGreaterThan(0);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Generación de datos de prueba", () => {
    test("Ejemplo: Emails con diferentes formatos", async () => {
      const service = new EmailServiceMock();
      const emails = EmailTestDataGenerator.createVariousValidEmails();

      for (const email of emails) {
        const result = await service.send(email);
        expect(result.success).toBe(true);
      }

      expect(service.getSentEmails()).toHaveLength(emails.length);
    });

    test("Ejemplo: Testing con datos inválidos", async () => {
      const service = new EmailServiceMock();
      const invalidEmails = EmailTestDataGenerator.createInvalidEmails();

      for (const invalidEmail of invalidEmails) {
        await expect(service.send(invalidEmail)).rejects.toThrow();
      }

      // Ningún email debería haberse enviado
      expect(service.getSentEmails()).toHaveLength(0);
    });

    test("Ejemplo: Envío en lote con datos generados", async () => {
      const service = new EmailServiceMock();
      const batch = EmailTestDataGenerator.createEmailBatch(5);

      const result = await service.sendBatch(batch);

      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
    });
  });

  describe("Assertions avanzadas", () => {
    test("Ejemplo: Verificar estadísticas específicas", async () => {
      const service = new EmailServiceMock();

      // Enviar algunos emails
      await service.send(EmailTestDataGenerator.createValidEmail());
      await service.send(EmailTestDataGenerator.createValidEmail());

      // Validar algunos emails
      await service.validate("test1@example.com");
      await service.validate("test2@example.com");

      // Verificar estadísticas
      EmailMockAssertions.assertStats(service, {
        totalSent: 2,
        totalValidated: 2,
        totalFailed: 0,
      });
    });

    test("Ejemplo: Verificar tiempo de respuesta", async () => {
      const service = new EmailServiceMock({ sendDelay: 50 });

      await service.send(EmailTestDataGenerator.createValidEmail());

      // Verificar que la llamada tomó al menos 50ms
      EmailMockAssertions.assertResponseTime(service, "send", 200);
    });

    test("Ejemplo: Verificar llamadas específicas", async () => {
      const service = new EmailServiceMock();
      const email = EmailTestDataGenerator.createValidEmail({
        to: "specific@example.com",
        subject: "Specific Test",
      });

      await service.send(email);

      EmailMockAssertions.assertMethodCalledWith(service, "send", email);
    });
  });

  describe("Escenarios complejos", () => {
    test("Ejemplo: Simulación de alta carga", async () => {
      const service = new EmailServiceMock(
        EmailServiceMockFactory.createPerformanceTest()
      );

      const tester = new EmailScenarioTester(service);
      const result = await tester.simulateHighLoad(50);

      expect(result.totalEmails).toBe(50);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.avgTimePerEmail).toBeLessThan(100); // Debería ser rápido
    });

    test("Ejemplo: Recuperación de errores", async () => {
      const service = new EmailServiceMock();
      const tester = new EmailScenarioTester(service);

      const result = await tester.simulateErrorRecovery();

      expect(result.initialError).toBeDefined();
      expect(result.wasRecovered).toBe(true);
      expect(result.recoveryResult.success).toBe(true);
    });

    test("Ejemplo: Límites dinámicos", async () => {
      const service = new EmailServiceMock();
      const tester = new EmailScenarioTester(service);

      const result = await tester.simulateDynamicLimits();

      expect(result.limitWasRespected).toBe(true);
      expect(result.beforeReset.failed).toBeGreaterThan(0);
      expect(result.afterReset.success).toBe(true);
    });
  });

  describe("Patrones de testing avanzados", () => {
    test("Ejemplo: Testing de retry logic", async () => {
      const service = new EmailServiceMock({ shouldFailSend: true }); // Forzar fallo inicial
      const email = EmailTestDataGenerator.createValidEmail();

      let attempts = 0;
      let success = false;
      const maxAttempts = 5;

      while (!success && attempts < maxAttempts) {
        attempts++;
        try {
          // En el último intento, hacer que funcione
          if (attempts === 3) {
            service.configure({ shouldFailSend: false });
          }
          await service.send(email);
          success = true;
        } catch (error) {
          // Simular espera antes del retry
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      expect(attempts).toBeGreaterThan(1);
      expect(service.getCallCount("send")).toBe(attempts);
    });

    test("Ejemplo: Testing de circuit breaker pattern", async () => {
      const service = new EmailServiceMock({ shouldFailSend: true });
      let circuitOpen = false;
      let consecutiveFailures = 0;
      const maxFailures = 3;

      for (let i = 0; i < 5; i++) {
        if (circuitOpen) {
          // Circuit breaker abierto, no intentar envío
          break;
        }

        try {
          await service.send(EmailTestDataGenerator.createValidEmail());
          consecutiveFailures = 0; // Reset en éxito
        } catch (error) {
          consecutiveFailures++;
          if (consecutiveFailures >= maxFailures) {
            circuitOpen = true;
          }
        }
      }

      expect(circuitOpen).toBe(true);
      expect(service.getCallCount("send")).toBe(maxFailures);
    });

    test("Ejemplo: Testing de rate limiting", async () => {
      const service = new EmailServiceMock({
        dailyLimit: 5,
        enableRateLimit: true,
        enableTracking: true,
      });

      const emails = EmailTestDataGenerator.createMultipleEmails(10);
      const results = [];
      const rateLimitErrors = [];

      for (const email of emails) {
        try {
          const result = await service.send(email);
          results.push(result);
        } catch (error) {
          if (error.message.includes("Rate limit")) {
            rateLimitErrors.push(error);
          }
        }
      }

      expect(results.length).toBe(5); // Solo 5 deberían pasar
      expect(rateLimitErrors.length).toBe(5); // 5 deberían ser bloqueados

      EmailMockAssertions.assertStats(service, {
        totalSent: 5,
        dailySent: 5,
      });
    });

    test("Ejemplo: Testing de fallback mechanism", async () => {
      const primaryService = new EmailServiceMock({ shouldFailSend: true });
      const fallbackService = new EmailServiceMock();

      const email = EmailTestDataGenerator.createValidEmail();
      let result;

      try {
        result = await primaryService.send(email);
      } catch (primaryError) {
        // Usar servicio de fallback
        result = await fallbackService.send(email);
      }

      expect(result.success).toBe(true);
      expect(primaryService.getCallCount("send")).toBe(1);
      expect(fallbackService.getCallCount("send")).toBe(1);
    });
  });

  describe("Integración con frameworks de testing", () => {
    describe("Ejemplo: Setup y teardown para suites de tests", () => {
      let emailService;

      beforeEach(() => {
        // Setup: crear servicio limpio para cada test
        emailService = new EmailServiceMock(
          EmailServiceMockFactory.createReliable()
        );
      });

      afterEach(() => {
        // Teardown: verificar que no quedaron llamadas sin verificar
        const unexpectedCalls = emailService.getCallCount();
        if (unexpectedCalls > 0) {
          console.warn(`Test left ${unexpectedCalls} unverified calls`);
        }
      });

      test("Test que usa el setup", async () => {
        const email = EmailTestDataGenerator.createValidEmail();
        const result = await emailService.send(email);
        expect(result.success).toBe(true);
      });
    });

    test("Ejemplo: Mocking con dependency injection", async () => {
      // Simular un servicio que usa el email service
      class NotificationService {
        constructor(emailService) {
          this.emailService = emailService;
        }

        async sendWelcomeEmail(user) {
          return this.emailService.send({
            to: user.email,
            subject: "Welcome!",
            body: `Welcome ${user.name}!`,
          });
        }
      }

      // Usar el mock en lugar del servicio real
      const emailMock = new EmailServiceMock();
      const notificationService = new NotificationService(emailMock);

      const user = { name: "John", email: "john@example.com" };
      await notificationService.sendWelcomeEmail(user);

      // Verificar que se llamó correctamente
      expect(emailMock.wasMethodCalled("send")).toBe(true);
      EmailMockAssertions.assertEmailSent(emailMock, {
        to: user.email,
        subject: "Welcome!",
      });
    });
  });
});
