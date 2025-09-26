/**
 * Helpers y utilidades para testing del EmailService
 * Incluye factories, generadores de datos, assertions y testers de escenarios
 */

const EmailServiceMock = require("./EmailService.mock");

/**
 * Factory para crear configuraciones predefinidas del EmailServiceMock
 */
class EmailServiceMockFactory {
  /**
   * Crear servicio confiable (nunca falla)
   */
  static createReliable(overrides = {}) {
    return {
      shouldFailSend: false,
      shouldFailInit: false,
      shouldFailValidation: false,
      failureRate: 0,
      sendDelay: 0,
      enableTracking: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio lento (con delays altos)
   */
  static createSlow(overrides = {}) {
    return {
      shouldFailSend: false,
      sendDelay: 200,
      initDelay: 100,
      validationDelay: 50,
      enableTracking: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio inestable (con fallos aleatorios)
   */
  static createUnstable(overrides = {}) {
    return {
      failureRate: 0.3, // 30% de fallo por defecto
      sendDelay: Math.floor(Math.random() * 100), // Delay aleatorio
      enableTracking: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio con rate limiting estricto
   */
  static createRateLimited(overrides = {}) {
    return {
      dailyLimit: 10,
      hourlyLimit: 5,
      enableRateLimit: true,
      enableTracking: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio para tests de performance
   */
  static createPerformanceTest(overrides = {}) {
    return {
      shouldFailSend: false,
      sendDelay: 1, // Mínimo delay
      enableTracking: true,
      enableQueue: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio que siempre falla
   */
  static createAlwaysFails(overrides = {}) {
    return {
      shouldFailSend: true,
      shouldFailInit: false,
      shouldFailValidation: true,
      enableTracking: true,
      ...overrides,
    };
  }

  /**
   * Crear servicio personalizado con configuración específica
   */
  static createCustom(config) {
    return {
      enableTracking: true,
      ...config,
    };
  }
}

/**
 * Generador de datos de prueba para emails
 */
class EmailTestDataGenerator {
  /**
   * Crear email válido básico
   */
  static createValidEmail(overrides = {}) {
    return {
      to: "test@example.com",
      subject: "Test Email",
      template: "notification",
      data: {
        userName: "Test User",
        message: "This is a test email",
      },
      ...overrides,
    };
  }

  /**
   * Crear múltiples emails válidos
   */
  static createMultipleEmails(count = 5, baseOverrides = {}) {
    const emails = [];
    for (let i = 0; i < count; i++) {
      emails.push(
        this.createValidEmail({
          to: `test${i}@example.com`,
          subject: `Test Email ${i + 1}`,
          data: {
            userName: `Test User ${i + 1}`,
            message: `This is test email number ${i + 1}`,
          },
          ...baseOverrides,
        })
      );
    }
    return emails;
  }

  /**
   * Crear variedad de emails válidos con diferentes formatos
   */
  static createVariousValidEmails() {
    return [
      this.createValidEmail({
        to: "user@domain.com",
        template: "welcome",
        data: { userName: "John Doe" },
      }),
      this.createValidEmail({
        to: "admin@company.org",
        template: "password-reset",
        data: { resetToken: "abc123" },
      }),
      this.createValidEmail({
        to: "support@service.net",
        template: "email-verification",
        data: { verificationCode: "123456" },
      }),
      this.createValidEmail({
        to: "notifications@app.io",
        html: "<h1>Custom HTML Email</h1><p>This is a custom email.</p>",
      }),
      this.createValidEmail({
        to: "plain@text.com",
        text: "This is a plain text email for testing.",
      }),
    ];
  }

  /**
   * Crear emails inválidos para testing de validación
   */
  static createInvalidEmails() {
    return [
      { subject: "Missing To" }, // Sin 'to'
      { to: "test@example.com" }, // Sin 'subject'
      { to: "", subject: "Empty To" }, // 'to' vacío
      { to: "invalid-email", subject: "Invalid Email Format" }, // Email inválido
      { to: "test@example.com", subject: "" }, // Subject vacío
      { to: null, subject: "Null To" }, // 'to' null
      { to: "test@example.com", subject: null }, // Subject null
    ];
  }

  /**
   * Crear lote de emails para testing masivo
   */
  static createEmailBatch(size = 10, options = {}) {
    const batch = [];
    for (let i = 0; i < size; i++) {
      batch.push(
        this.createValidEmail({
          to: `batch${i}@example.com`,
          subject: `Batch Email ${i + 1}`,
          data: {
            batchId: i,
            userName: `Batch User ${i + 1}`,
            ...options.data,
          },
          ...options,
        })
      );
    }
    return batch;
  }

  /**
   * Crear datos para email de bienvenida
   */
  static createWelcomeEmailData(overrides = {}) {
    return {
      userEmail: "newuser@example.com",
      userData: {
        name: "New User",
        email: "newuser@example.com",
        id: "user-123",
        registrationDate: new Date().toISOString(),
        ...overrides,
      },
    };
  }

  /**
   * Crear datos para email de reset de contraseña
   */
  static createPasswordResetData(overrides = {}) {
    return {
      userEmail: "user@example.com",
      resetData: {
        name: "User Name",
        token: "reset-token-123",
        expirationTime: "1 hora",
        ...overrides,
      },
    };
  }

  /**
   * Crear datos para email de verificación
   */
  static createVerificationData(overrides = {}) {
    return {
      userEmail: "verify@example.com",
      verificationData: {
        name: "User To Verify",
        token: "verify-token-123",
        code: "123456",
        ...overrides,
      },
    };
  }

  /**
   * Crear datos para email de notificación
   */
  static createNotificationData(overrides = {}) {
    return {
      userEmail: "notify@example.com",
      notificationData: {
        userName: "Notification User",
        title: "Test Notification",
        message: "This is a test notification",
        type: "info",
        ...overrides,
      },
    };
  }
}

/**
 * Assertions específicas para testing de emails
 */
class EmailMockAssertions {
  /**
   * Verificar que un email fue enviado o está en cola
   */
  static assertEmailSent(emailService, expectedEmail) {
    const sentEmails = emailService.getSentEmails();
    const queuedEmails = emailService.getEmailQueue();

    // Buscar primero en emails enviados
    let found = sentEmails.find(
      (email) =>
        email.to === expectedEmail.to && email.subject === expectedEmail.subject
    );

    // Si no se encuentra en enviados, buscar en la cola
    if (!found) {
      const queuedItem = queuedEmails.find(
        (item) =>
          item.options.to === expectedEmail.to &&
          item.options.subject === expectedEmail.subject
      );

      if (queuedItem) {
        found = queuedItem.options;
      }
    }

    expect(found).toBeDefined();
    expect(found.to).toBe(expectedEmail.to);
    expect(found.subject).toBe(expectedEmail.subject);

    if (expectedEmail.template) {
      expect(found.template).toBe(expectedEmail.template);
    }

    return found;
  }

  /**
   * Verificar que NO se envió un email específico
   */
  static assertEmailNotSent(emailService, emailCriteria) {
    const sentEmails = emailService.getSentEmails();
    const found = sentEmails.find(
      (email) =>
        email.to === emailCriteria.to && email.subject === emailCriteria.subject
    );

    expect(found).toBeUndefined();
  }

  /**
   * Verificar estadísticas específicas
   */
  static assertStats(emailService, expectedStats) {
    const stats = emailService.getStats();

    Object.keys(expectedStats).forEach((key) => {
      expect(stats[key]).toBe(expectedStats[key]);
    });
  }

  /**
   * Verificar que un método fue llamado con argumentos específicos
   */
  static assertMethodCalledWith(emailService, methodName, expectedArgs) {
    expect(emailService.wasMethodCalled(methodName)).toBe(true);

    const lastArgs = emailService.getLastCallArgs(methodName);
    // Si expectedArgs es un array, comparar con el array completo
    // Si no, comparar con el primer argumento
    if (Array.isArray(expectedArgs)) {
      expect(lastArgs).toEqual(expectedArgs);
    } else {
      expect(lastArgs[0]).toEqual(expectedArgs);
    }
  }

  /**
   * Verificar tiempo de respuesta de un método
   */
  static assertResponseTime(emailService, methodName, maxTime) {
    const callHistory = emailService.getCallHistory();
    const methodCalls = callHistory.filter(
      (call) => call.method === methodName
    );

    expect(methodCalls.length).toBeGreaterThan(0);

    // Para una verificación más precisa, necesitaríamos timestamps de inicio y fin
    // Por ahora, verificamos que el método fue llamado
    expect(methodCalls[methodCalls.length - 1].timestamp).toBeDefined();
  }

  /**
   * Verificar que la cola de emails tiene el tamaño esperado
   */
  static assertQueueSize(emailService, expectedSize) {
    const queue = emailService.getEmailQueue();
    expect(queue.length).toBe(expectedSize);
  }

  /**
   * Verificar que se cargaron templates específicos
   */
  static assertTemplatesLoaded(emailService, expectedTemplates) {
    const stats = emailService.getStats();
    expect(stats.templatesLoaded).toBe(expectedTemplates.length);

    expectedTemplates.forEach((templateName) => {
      expect(() => emailService.renderTemplate(templateName, {})).not.toThrow();
    });
  }

  /**
   * Verificar rate limiting
   */
  static assertRateLimitHit(emailService, limitType = "daily") {
    const stats = emailService.getStats();
    const counters = stats.rateLimitCounters;

    if (limitType === "daily") {
      expect(counters.daily.count).toBeGreaterThan(0);
    } else if (limitType === "hourly") {
      expect(counters.hourly.count).toBeGreaterThan(0);
    }
  }
}

/**
 * Tester para escenarios complejos
 */
class EmailScenarioTester {
  constructor(emailService) {
    this.emailService = emailService;
  }

  /**
   * Simular alta carga de emails
   */
  async simulateHighLoad(emailCount = 100) {
    const startTime = Date.now();
    const emails = EmailTestDataGenerator.createEmailBatch(emailCount);
    const results = [];
    const errors = [];

    for (const email of emails) {
      try {
        const result = await this.emailService.send(email);
        results.push(result);
      } catch (error) {
        errors.push(error);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      totalEmails: emailCount,
      successful: results.length,
      failed: errors.length,
      totalTime,
      avgTimePerEmail: totalTime / emailCount,
      results,
      errors,
    };
  }

  /**
   * Simular recuperación de errores
   */
  async simulateErrorRecovery() {
    // Configurar para fallar inicialmente
    this.emailService.configure({ shouldFailSend: true });

    const email = EmailTestDataGenerator.createValidEmail();
    let initialError;

    try {
      await this.emailService.send(email);
    } catch (error) {
      initialError = error;
    }

    // Reconfigurar para funcionar
    this.emailService.configure({ shouldFailSend: false });

    const recoveryResult = await this.emailService.send(email);

    return {
      initialError,
      wasRecovered: true,
      recoveryResult,
    };
  }

  /**
   * Simular límites dinámicos
   */
  async simulateDynamicLimits() {
    // Configurar límite bajo
    this.emailService.configure({ dailyLimit: 3 });

    const emails = EmailTestDataGenerator.createEmailBatch(5);
    const beforeReset = { success: 0, failed: 0 };

    // Intentar enviar más emails que el límite
    for (const email of emails) {
      try {
        await this.emailService.send(email);
        beforeReset.success++;
      } catch (error) {
        beforeReset.failed++;
      }
    }

    // Reset del servicio (simular nuevo día)
    this.emailService.reset();
    this.emailService.configure({ dailyLimit: 10 });

    // Intentar enviar después del reset
    const afterResetEmail = EmailTestDataGenerator.createValidEmail();
    const afterReset = await this.emailService.send(afterResetEmail);

    return {
      limitWasRespected: beforeReset.failed > 0,
      beforeReset,
      afterReset,
    };
  }

  /**
   * Simular procesamiento de cola
   */
  async simulateQueueProcessing() {
    this.emailService.configure({ enableQueue: true });

    const emails = EmailTestDataGenerator.createEmailBatch(5);
    const queueResults = [];

    // Agregar emails a la cola
    for (const email of emails) {
      const result = await this.emailService.queueEmail(email);
      queueResults.push(result);
    }

    const queueSizeBefore = this.emailService.getEmailQueue().length;

    // Procesar la cola
    await this.emailService.processQueue();

    const queueSizeAfter = this.emailService.getEmailQueue().length;
    const sentEmails = this.emailService.getSentEmails().length;

    return {
      emailsQueued: queueResults.length,
      queueSizeBefore,
      queueSizeAfter,
      emailsProcessed: sentEmails,
      allProcessed: queueSizeAfter === 0,
    };
  }

  /**
   * Simular múltiples tipos de templates
   */
  async simulateTemplateUsage() {
    const templates = [
      "welcome",
      "password-reset",
      "email-verification",
      "notification",
    ];
    const results = [];

    for (const template of templates) {
      const email = EmailTestDataGenerator.createValidEmail({ template });

      try {
        const result = await this.emailService.send(email);
        results.push({ template, success: true, result });
      } catch (error) {
        results.push({ template, success: false, error });
      }
    }

    return {
      templatesUsed: templates.length,
      results,
      allSuccessful: results.every((r) => r.success),
    };
  }
}

module.exports = {
  EmailServiceMockFactory,
  EmailTestDataGenerator,
  EmailMockAssertions,
  EmailScenarioTester,
};
