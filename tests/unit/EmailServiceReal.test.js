/**
 * Tests unitarios para el EmailService REAL
 * Estos tests prueban el servicio real, no los mocks
 */

const { EmailService } = require("../../services/emailService");

// Mock de nodemailer para evitar envíos reales
jest.mock("nodemailer", () => ({
  createTransporter: jest.fn(() => ({
    verify: jest.fn(() => Promise.resolve()),
    sendMail: jest.fn(() =>
      Promise.resolve({
        messageId: "test-message-id",
        response: "250 Message accepted",
        accepted: ["test@example.com"],
        rejected: [],
        pending: [],
        envelope: { from: "test@sender.com", to: ["test@example.com"] },
      })
    ),
  })),
}));

// Mock del fs para templates
jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(() => Promise.resolve(["test.html", "welcome.html"])),
    readFile: jest.fn(() =>
      Promise.resolve("<h1>{{title}}</h1><p>{{message}}</p>")
    ),
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
  },
}));

// Mock de la configuración
jest.mock("../../config/emailConfig", () => ({
  emailConfig: {
    provider: "smtp",
    from: "test@sender.com",
    fromName: "Test Sender",
    development: {
      enabled: true,
      logToConsole: true,
      saveToFile: false,
      filePath: "emails.json",
    },
    queue: {
      enabled: false, // Deshabilitar cola en tests para evitar logs asíncronos
      maxConcurrent: 5,
      delay: 1000,
      batchSize: 10,
    },
    rateLimit: {
      enabled: true,
      maxPerHour: 100,
      maxPerDay: 1000,
    },
    retry: {
      attempts: 3,
      delay: 5000,
      backoff: "exponential",
    },
    logging: {
      enabled: false, // Deshabilitar logs en tests
    },
    templates: {
      baseUrl: "http://localhost:3000",
      defaultLanguage: "es",
    },
  },
  getProviderConfig: jest.fn(() => ({
    host: "smtp.test.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@test.com",
      pass: "testpass",
    },
  })),
  validateConfig: jest.fn(() => ({ isValid: true, errors: [] })),
}));

describe("EmailService Real Unit Tests", () => {
  let emailService;

  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();

    // Crear nueva instancia del servicio real
    emailService = new EmailService();
  });

  afterEach(async () => {
    // Limpiar timers y operaciones asíncronas pendientes
    if (emailService && emailService.emailQueue) {
      emailService.emailQueue = [];
    }

    // Esperar un momento para que terminen las operaciones asíncronas
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe("Inicialización", () => {
    test("debe inicializar correctamente", async () => {
      expect(emailService).toBeDefined();
      expect(emailService.transporter).toBeDefined();
      expect(emailService.templates).toBeDefined();
    });

    test("debe cargar templates", async () => {
      await emailService.loadTemplates();
      expect(emailService.templates.size).toBeGreaterThan(0);
    });

    test("debe crear transporter", async () => {
      await emailService.createTransporter();
      expect(emailService.transporter).toBeDefined();
    });
  });

  describe("Renderizado de templates", () => {
    test("debe renderizar template con datos", () => {
      // Simular template cargado
      const mockTemplate = jest.fn(() => "<h1>Test</h1>");
      emailService.templates.set("test", mockTemplate);

      const result = emailService.renderTemplate("test", { title: "Test" });

      expect(mockTemplate).toHaveBeenCalledWith({
        companyName: "Test Sender",
        companyAddress: "123 Main Street, Ciudad, País",
        footerText: expect.stringContaining("Test Sender"),
        socialLinks: "",
        unsubscribeUrl: "http://localhost:3000/unsubscribe",
        language: "es",
        title: "Test",
        headerSubtitle: "Sistema de gestión de usuarios",
      });
    });

    test("debe fallar con template inexistente", () => {
      expect(() => {
        emailService.renderTemplate("nonexistent", {});
      }).toThrow("Template no encontrado: nonexistent");
    });
  });

  describe("Envío de emails", () => {
    test("debe enviar email básico", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Email",
        text: "This is a test email",
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(emailService.transporter.sendMail).toHaveBeenCalled();
    });

    test("debe validar opciones requeridas", async () => {
      await expect(emailService.sendEmail({})).rejects.toThrow(
        'Los campos "to" y "subject" son requeridos'
      );
    });

    test("debe manejar emails con template", async () => {
      // Simular template cargado
      emailService.templates.set("test", () => "<h1>Test Template</h1>");

      const emailOptions = {
        to: "test@example.com",
        subject: "Template Test",
        template: "test",
        data: { message: "Test message" },
      };

      const result = await emailService.sendEmail(emailOptions);
      expect(result.success).toBe(true);
    });
  });

  describe("Métodos de conveniencia", () => {
    beforeEach(() => {
      // Simular templates necesarios
      emailService.templates.set("welcome", () => "<h1>Welcome</h1>");
      emailService.templates.set("password-reset", () => "<h1>Reset</h1>");
      emailService.templates.set("email-verification", () => "<h1>Verify</h1>");
      emailService.templates.set("notification", () => "<h1>Notification</h1>");
    });

    test("debe enviar email de bienvenida", async () => {
      const result = await emailService.sendWelcomeEmail("user@test.com", {
        name: "Test User",
        email: "user@test.com",
        id: "user-123",
      });

      expect(result.success).toBe(true);
    });

    test("debe enviar email de reset de contraseña", async () => {
      const result = await emailService.sendPasswordResetEmail(
        "user@test.com",
        {
          name: "Test User",
          token: "reset-token-123",
        }
      );

      expect(result.success).toBe(true);
    });

    test("debe enviar email de verificación", async () => {
      const result = await emailService.sendVerificationEmail("user@test.com", {
        name: "Test User",
        token: "verify-token-123",
        code: "123456",
      });

      expect(result.success).toBe(true);
    });

    test("debe enviar email de notificación", async () => {
      const result = await emailService.sendNotificationEmail("user@test.com", {
        userName: "Test User",
        title: "Test Notification",
        message: "This is a test notification",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Sistema de colas", () => {
    test("debe tener sistema de cola disponible", () => {
      expect(emailService.emailQueue).toBeDefined();
      expect(Array.isArray(emailService.emailQueue)).toBe(true);
    });

    test("debe enviar directamente cuando cola está deshabilitada", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Direct Send Test",
        text: "This email should be sent directly",
      };

      const result = await emailService.queueEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined(); // Indica envío directo
    });
  });

  describe("Rate limiting", () => {
    test("debe verificar rate limits", () => {
      const canSend = emailService.checkRateLimit();
      expect(typeof canSend).toBe("boolean");
    });

    test("debe actualizar contadores de rate limit", () => {
      const initialHourly = emailService.rateLimitCounters.hourly.count;
      const initialDaily = emailService.rateLimitCounters.daily.count;

      emailService.updateRateLimitCounters();

      expect(emailService.rateLimitCounters.hourly.count).toBe(
        initialHourly + 1
      );
      expect(emailService.rateLimitCounters.daily.count).toBe(initialDaily + 1);
    });
  });

  describe("Estadísticas", () => {
    test("debe proporcionar estadísticas", () => {
      const stats = emailService.getStats();

      expect(stats).toHaveProperty("emailsSent");
      expect(stats).toHaveProperty("emailsFailed");
      expect(stats).toHaveProperty("queueSize");
      expect(stats).toHaveProperty("templatesLoaded");
      expect(stats).toHaveProperty("rateLimitCounters");
      expect(stats).toHaveProperty("provider");
    });
  });

  describe("Utilidades", () => {
    test("debe generar IDs únicos", () => {
      const id1 = emailService.generateId();
      const id2 = emailService.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test("debe convertir HTML a texto", () => {
      const html =
        "<h1>Title</h1><p>Content with <strong>bold</strong> text</p>";
      const text = emailService.htmlToText(html);

      // El método htmlToText del EmailService real no agrega espacios entre tags
      expect(text).toBe("TitleContent with bold text");
    });

    test("debe hacer sleep", async () => {
      const startTime = Date.now();
      await emailService.sleep(50);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(45);
    });
  });

  describe("Logging", () => {
    test("debe tener método de logging disponible", () => {
      // Verificar que el método log existe y es una función
      expect(typeof emailService.log).toBe("function");

      // Llamar al método sin verificar el output ya que logging está deshabilitado en tests
      expect(() => {
        emailService.log("info", "Test log message");
      }).not.toThrow();
    });
  });

  describe("Manejo de errores", () => {
    test("debe manejar errores de envío", async () => {
      // Configurar transporter para fallar
      emailService.transporter.sendMail = jest.fn(() =>
        Promise.reject(new Error("Send failed"))
      );

      await expect(
        emailService.sendEmail({
          to: "test@example.com",
          subject: "Failing test",
          text: "This should fail",
        })
      ).rejects.toThrow("Send failed");
    });

    test("debe manejar errores de rate limit", async () => {
      // Simular rate limit excedido
      emailService.checkRateLimit = jest.fn(() => false);

      await expect(
        emailService.sendEmail({
          to: "test@example.com",
          subject: "Rate limited",
          text: "This should be rate limited",
        })
      ).rejects.toThrow("Rate limit excedido");
    });
  });

  describe("Modo desarrollo", () => {
    test("debe simular envío en modo desarrollo", () => {
      const result = emailService.simulateEmailSend({
        to: "test@example.com",
        subject: "Development test",
        from: "sender@test.com",
        text: "This is a development test",
      });

      expect(result.messageId).toContain("simulated-");
      expect(result.response).toContain("simulado");
    });

    test("debe guardar email en archivo en desarrollo", async () => {
      const fs = require("fs").promises;

      await emailService.saveEmailToFile({
        to: "test@example.com",
        subject: "File save test",
        text: "This should be saved to file",
      });

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
