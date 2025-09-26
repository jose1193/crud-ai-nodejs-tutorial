/**
 * Tests unitarios para EmailService usando mocks
 * Cubre todas las funcionalidades principales del servicio de email
 */

const EmailServiceMock = require("../mocks/EmailService.mock");
const {
  EmailServiceMockFactory,
  EmailTestDataGenerator,
  EmailMockAssertions,
  EmailScenarioTester,
} = require("../mocks/EmailService.helpers");

describe("EmailService Unit Tests", () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailServiceMock();
    // Reset para limpiar cualquier llamada del constructor/init
    emailService.reset();
  });

  afterEach(() => {
    emailService.reset();
  });

  describe("Inicialización del servicio", () => {
    test("debe inicializar correctamente con configuración por defecto", async () => {
      expect(emailService.isInitialized).toBe(true);
      expect(emailService.templates.size).toBeGreaterThan(0);
      expect(emailService.transporter).toBeDefined();
    });

    test("debe fallar la inicialización cuando está configurado para fallar", async () => {
      const failingService = new EmailServiceMock({ shouldFailInit: true });

      await expect(failingService.init()).rejects.toThrow(
        "Mock configured to fail initialization"
      );
      expect(failingService.isInitialized).toBe(false);
    });

    test("debe cargar templates correctamente", async () => {
      await emailService.loadTemplates();

      const expectedTemplates = [
        "welcome",
        "password-reset",
        "email-verification",
        "notification",
      ];
      EmailMockAssertions.assertTemplatesLoaded(
        emailService,
        expectedTemplates
      );
    });

    test("debe crear transporter exitosamente", async () => {
      await emailService.createTransporter();

      expect(emailService.transporter).toBeDefined();
      expect(emailService.transporter.verify).toBeDefined();
      expect(emailService.transporter.sendMail).toBeDefined();
    });
  });

  describe("Envío de emails básico", () => {
    test("debe enviar email válido exitosamente", async () => {
      const email = EmailTestDataGenerator.createValidEmail();
      const result = await emailService.send(email);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.response).toBeDefined();

      EmailMockAssertions.assertEmailSent(emailService, email);
    });

    test("debe rechazar email sin destinatario", async () => {
      const invalidEmail = { subject: "Test" };

      await expect(emailService.send(invalidEmail)).rejects.toThrow(
        'Los campos "to" y "subject" son requeridos'
      );

      const stats = emailService.getStats();
      expect(stats.totalFailed).toBe(1);
      expect(stats.totalSent).toBe(0);
    });

    test("debe rechazar email sin asunto", async () => {
      const invalidEmail = { to: "test@example.com" };

      await expect(emailService.send(invalidEmail)).rejects.toThrow(
        'Los campos "to" y "subject" son requeridos'
      );

      EmailMockAssertions.assertStats(emailService, {
        totalFailed: 1,
        totalSent: 0,
      });
    });

    test("debe manejar múltiples emails válidos", async () => {
      const emails = EmailTestDataGenerator.createMultipleEmails(3);

      for (const email of emails) {
        const result = await emailService.send(email);
        expect(result.success).toBe(true);
      }

      EmailMockAssertions.assertStats(emailService, {
        totalSent: 3,
        totalFailed: 0,
      });
    });
  });

  describe("Templates y renderizado", () => {
    test("debe renderizar template existente", () => {
      const data = { userName: "Test User", message: "Test message" };
      const html = emailService.renderTemplate("notification", data);

      expect(html).toContain("Mock Template: notification");
      expect(html).toContain(JSON.stringify(data, null, 2));
    });

    test("debe fallar al renderizar template inexistente", () => {
      expect(() => {
        emailService.renderTemplate("nonexistent", {});
      }).toThrow("Template no encontrado: nonexistent");
    });

    test("debe usar template en envío de email", async () => {
      const email = EmailTestDataGenerator.createValidEmail({
        template: "welcome",
        data: { userName: "John Doe" },
      });

      const result = await emailService.send(email);
      expect(result.success).toBe(true);

      const sentEmails = emailService.getSentEmails();
      expect(sentEmails[0].template).toBe("welcome");
    });
  });

  describe("Métodos de conveniencia", () => {
    test("debe enviar email de bienvenida", async () => {
      const { userEmail, userData } =
        EmailTestDataGenerator.createWelcomeEmailData();

      const result = await emailService.sendWelcomeEmail(userEmail, userData);

      expect(result.success).toBe(true);
      expect(emailService.wasMethodCalled("sendWelcomeEmail")).toBe(true);

      EmailMockAssertions.assertEmailSent(emailService, {
        to: userEmail,
        subject: "¡Bienvenido!",
      });
    });

    test("debe enviar email de reset de contraseña", async () => {
      const { userEmail, resetData } =
        EmailTestDataGenerator.createPasswordResetData();

      const result = await emailService.sendPasswordResetEmail(
        userEmail,
        resetData
      );

      expect(result.success).toBe(true);
      expect(emailService.wasMethodCalled("sendPasswordResetEmail")).toBe(true);

      EmailMockAssertions.assertEmailSent(emailService, {
        to: userEmail,
        subject: "Recuperación de contraseña",
      });
    });

    test("debe enviar email de verificación", async () => {
      const { userEmail, verificationData } =
        EmailTestDataGenerator.createVerificationData();

      const result = await emailService.sendVerificationEmail(
        userEmail,
        verificationData
      );

      expect(result.success).toBe(true);
      expect(emailService.wasMethodCalled("sendVerificationEmail")).toBe(true);

      EmailMockAssertions.assertEmailSent(emailService, {
        to: userEmail,
        subject: "Verificación de email",
      });
    });

    test("debe enviar email de notificación", async () => {
      const { userEmail, notificationData } =
        EmailTestDataGenerator.createNotificationData();

      const result = await emailService.sendNotificationEmail(
        userEmail,
        notificationData
      );

      expect(result.success).toBe(true);
      expect(emailService.wasMethodCalled("sendNotificationEmail")).toBe(true);

      EmailMockAssertions.assertEmailSent(emailService, {
        to: userEmail,
        subject: notificationData.title,
      });
    });
  });

  describe("Sistema de colas", () => {
    test("debe agregar email a la cola", async () => {
      emailService.configure({ enableQueue: true });
      const email = EmailTestDataGenerator.createValidEmail();

      const result = await emailService.queueEmail(email);

      expect(result.success).toBe(true);
      expect(result.queueId).toBeDefined();

      const queue = emailService.getEmailQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].options).toEqual(email);
    });

    test("debe procesar cola de emails", async () => {
      emailService.configure({ enableQueue: true });
      const emails = EmailTestDataGenerator.createEmailBatch(3);

      // Agregar emails a la cola
      for (const email of emails) {
        await emailService.queueEmail(email);
      }

      EmailMockAssertions.assertQueueSize(emailService, 3);

      // Procesar cola
      await emailService.processQueue();

      EmailMockAssertions.assertQueueSize(emailService, 0);
      EmailMockAssertions.assertStats(emailService, {
        totalSent: 3,
      });
    });

    test("debe enviar directamente si la cola está deshabilitada", async () => {
      emailService.configure({ enableQueue: false });
      const email = EmailTestDataGenerator.createValidEmail();

      const result = await emailService.queueEmail(email);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined(); // Indica envío directo

      EmailMockAssertions.assertStats(emailService, {
        totalSent: 1,
      });
    });
  });

  describe("Envío en lote", () => {
    test("debe enviar lote de emails exitosamente", async () => {
      const emails = EmailTestDataGenerator.createEmailBatch(5);

      const result = await emailService.sendBatch(emails);

      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(5);

      EmailMockAssertions.assertStats(emailService, {
        totalSent: 5,
        totalFailed: 0,
      });
    });

    test("debe manejar fallos parciales en lote", async () => {
      emailService.configure({ failureRate: 0.5 }); // 50% de fallo
      const emails = EmailTestDataGenerator.createEmailBatch(10);

      const result = await emailService.sendBatch(emails);

      expect(result.successful + result.failed).toBe(10);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.successful).toBeGreaterThan(0);
    });

    test("debe manejar lote con emails inválidos", async () => {
      const validEmails = EmailTestDataGenerator.createEmailBatch(2);
      const invalidEmails = EmailTestDataGenerator.createInvalidEmails().slice(
        0,
        2
      );
      const mixedBatch = [...validEmails, ...invalidEmails];

      const result = await emailService.sendBatch(mixedBatch);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(2);
    });
  });

  describe("Validación de emails", () => {
    test("debe validar email con formato correcto", async () => {
      const validEmail = "test@example.com";

      const result = await emailService.validate(validEmail);

      expect(result.isValid).toBe(true);
      expect(result.email).toBe(validEmail);
      expect(result.reason).toBe("Valid format");

      EmailMockAssertions.assertStats(emailService, {
        totalValidated: 1,
      });
    });

    test("debe rechazar email con formato incorrecto", async () => {
      const invalidEmail = "not-an-email";

      const result = await emailService.validate(invalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Invalid email format");
    });

    test("debe fallar validación cuando está configurado para fallar", async () => {
      emailService.configure({ shouldFailValidation: true });

      await expect(emailService.validate("test@example.com")).rejects.toThrow(
        "Mock validation failure"
      );
    });
  });

  describe("Rate limiting", () => {
    test("debe respetar límite diario", async () => {
      emailService.configure({
        dailyLimit: 2,
        enableRateLimit: true,
      });

      const emails = EmailTestDataGenerator.createEmailBatch(4);
      const results = [];
      const errors = [];

      for (const email of emails) {
        try {
          const result = await emailService.send(email);
          results.push(result);
        } catch (error) {
          errors.push(error);
        }
      }

      expect(results).toHaveLength(2);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain("Rate limit excedido");
    });

    test("debe respetar límite por hora", async () => {
      emailService.configure({
        hourlyLimit: 1,
        enableRateLimit: true,
      });

      const email1 = EmailTestDataGenerator.createValidEmail();
      const email2 = EmailTestDataGenerator.createValidEmail();

      const result1 = await emailService.send(email1);
      expect(result1.success).toBe(true);

      await expect(emailService.send(email2)).rejects.toThrow(
        "Rate limit excedido"
      );
    });

    test("debe permitir envío cuando rate limiting está deshabilitado", async () => {
      emailService.configure({
        dailyLimit: 1,
        enableRateLimit: false,
      });

      const emails = EmailTestDataGenerator.createEmailBatch(3);

      for (const email of emails) {
        const result = await emailService.send(email);
        expect(result.success).toBe(true);
      }

      EmailMockAssertions.assertStats(emailService, {
        totalSent: 3,
      });
    });
  });

  describe("Estadísticas y monitoreo", () => {
    test("debe proporcionar estadísticas correctas", async () => {
      const emails = EmailTestDataGenerator.createEmailBatch(3);

      for (const email of emails) {
        await emailService.send(email);
      }

      await emailService.validate("test@example.com");

      const stats = emailService.getStats();

      expect(stats.totalSent).toBe(3);
      expect(stats.totalFailed).toBe(0);
      expect(stats.totalValidated).toBe(1);
      expect(stats.emailsSent).toBe(3);
      expect(stats.templatesLoaded).toBeGreaterThan(0);
      expect(stats.provider).toBe("mock");
    });

    test("debe rastrear emails enviados correctamente", () => {
      const email = EmailTestDataGenerator.createValidEmail();

      return emailService.send(email).then(() => {
        const sentEmails = emailService.getSentEmails();

        expect(sentEmails).toHaveLength(1);
        expect(sentEmails[0].to).toBe(email.to);
        expect(sentEmails[0].subject).toBe(email.subject);
        expect(sentEmails[0].sentAt).toBeDefined();
        expect(sentEmails[0].messageId).toBeDefined();
      });
    });

    test("debe rastrear emails fallidos", async () => {
      emailService.configure({ shouldFailSend: true });
      const email = EmailTestDataGenerator.createValidEmail();

      try {
        await emailService.send(email);
      } catch (error) {
        // Error esperado
      }

      const failedEmails = emailService.getFailedEmails();

      expect(failedEmails).toHaveLength(1);
      expect(failedEmails[0].to).toBe(email.to);
      expect(failedEmails[0].error).toBeDefined();
      expect(failedEmails[0].failedAt).toBeDefined();
    });
  });

  describe("Tracking de llamadas a métodos", () => {
    test("debe rastrear llamadas a métodos", async () => {
      const email = EmailTestDataGenerator.createValidEmail();

      await emailService.send(email);
      await emailService.validate("test@example.com");

      expect(emailService.wasMethodCalled("send")).toBe(true);
      expect(emailService.wasMethodCalled("validate")).toBe(true);
      expect(emailService.wasMethodCalled("nonexistent")).toBe(false);

      expect(emailService.getCallCount("send")).toBe(1);
      expect(emailService.getCallCount("validate")).toBe(1);
      expect(emailService.getCallCount()).toBe(2); // Total de llamadas
    });

    test("debe proporcionar argumentos de la última llamada", async () => {
      const email = EmailTestDataGenerator.createValidEmail();

      await emailService.send(email);

      const lastArgs = emailService.getLastCallArgs("send");
      expect(lastArgs).toEqual([email]);
    });

    test("debe mantener historial completo de llamadas", async () => {
      await emailService.send(EmailTestDataGenerator.createValidEmail());
      await emailService.validate("test@example.com");

      const history = emailService.getCallHistory();

      expect(history).toHaveLength(2);
      expect(history[0].method).toBe("send");
      expect(history[1].method).toBe("validate");

      history.forEach((call) => {
        expect(call.timestamp).toBeDefined();
        expect(call.args).toBeDefined();
      });
    });
  });

  describe("Reset y limpieza", () => {
    test("debe limpiar estado correctamente", async () => {
      // Generar actividad
      await emailService.send(EmailTestDataGenerator.createValidEmail());
      await emailService.validate("test@example.com");

      // Verificar que hay actividad
      expect(emailService.getSentEmails()).toHaveLength(1);
      expect(emailService.getValidatedEmails()).toHaveLength(1);
      expect(emailService.getCallCount()).toBeGreaterThan(0);

      // Reset
      emailService.reset();

      // Verificar limpieza
      expect(emailService.getSentEmails()).toHaveLength(0);
      expect(emailService.getValidatedEmails()).toHaveLength(0);
      expect(emailService.getFailedEmails()).toHaveLength(0);
      expect(emailService.getCallCount()).toBe(0);

      const stats = emailService.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.totalValidated).toBe(0);
    });
  });

  describe("Configuración dinámica", () => {
    test("debe permitir reconfiguración en tiempo de ejecución", async () => {
      // Configuración inicial - servicio confiable
      const email = EmailTestDataGenerator.createValidEmail();
      const result1 = await emailService.send(email);
      expect(result1.success).toBe(true);

      // Reconfigurar para fallar
      emailService.configure({ shouldFailSend: true });

      await expect(emailService.send(email)).rejects.toThrow();

      // Reconfigurar de vuelta a confiable
      emailService.configure({ shouldFailSend: false });

      const result2 = await emailService.send(email);
      expect(result2.success).toBe(true);
    });
  });
});

describe("EmailService Factory Tests", () => {
  test("debe crear servicio confiable", () => {
    const config = EmailServiceMockFactory.createReliable();
    const service = new EmailServiceMock(config);

    expect(service.config.shouldFailSend).toBe(false);
    expect(service.config.failureRate).toBe(0);
  });

  test("debe crear servicio lento", () => {
    const config = EmailServiceMockFactory.createSlow({ sendDelay: 500 });
    const service = new EmailServiceMock(config);

    expect(service.config.sendDelay).toBe(500);
  });

  test("debe crear servicio inestable", () => {
    const config = EmailServiceMockFactory.createUnstable({ failureRate: 0.7 });
    const service = new EmailServiceMock(config);

    expect(service.config.failureRate).toBe(0.7);
  });

  test("debe crear servicio con rate limiting", () => {
    const config = EmailServiceMockFactory.createRateLimited();
    const service = new EmailServiceMock(config);

    expect(service.config.dailyLimit).toBeDefined();
    expect(service.config.hourlyLimit).toBeDefined();
    expect(service.config.enableRateLimit).toBe(true);
  });
});

describe("EmailService Scenario Tests", () => {
  let emailService;
  let scenarioTester;

  beforeEach(() => {
    emailService = new EmailServiceMock();
    // Reset para limpiar cualquier llamada del constructor/init
    emailService.reset();
    scenarioTester = new EmailScenarioTester(emailService);
  });

  test("debe manejar alta carga de emails", async () => {
    const result = await scenarioTester.simulateHighLoad(20);

    expect(result.totalEmails).toBe(20);
    expect(result.successful).toBeGreaterThan(0);
    expect(result.avgTimePerEmail).toBeDefined();
  });

  test("debe simular recuperación de errores", async () => {
    const result = await scenarioTester.simulateErrorRecovery();

    expect(result.initialError).toBeDefined();
    expect(result.wasRecovered).toBe(true);
    expect(result.recoveryResult.success).toBe(true);
  });

  test("debe manejar límites dinámicos", async () => {
    const result = await scenarioTester.simulateDynamicLimits();

    expect(result.limitWasRespected).toBe(true);
    expect(result.beforeReset.failed).toBeGreaterThan(0);
    expect(result.afterReset.success).toBe(true);
  });

  test("debe procesar cola correctamente", async () => {
    const result = await scenarioTester.simulateQueueProcessing();

    expect(result.emailsQueued).toBeGreaterThan(0);
    expect(result.allProcessed).toBe(true);
    expect(result.queueSizeAfter).toBe(0);
  });

  test("debe usar múltiples templates", async () => {
    const result = await scenarioTester.simulateTemplateUsage();

    expect(result.templatesUsed).toBeGreaterThan(0);
    expect(result.allSuccessful).toBe(true);
  });
});
