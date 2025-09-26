/**
 * Tests unitarios para EmailController usando mocks
 * Prueba todos los endpoints y funcionalidades del controlador
 */

const EmailController = require("../../controllers/emailController");
const EmailServiceMock = require("../mocks/EmailService.mock");
const {
  EmailServiceMockFactory,
  EmailTestDataGenerator,
  EmailMockAssertions,
} = require("../mocks/EmailService.helpers");

// Mock del módulo getEmailService
jest.mock("../../services/emailService", () => ({
  getEmailService: jest.fn(),
}));

const { getEmailService } = require("../../services/emailService");

describe("EmailController Unit Tests", () => {
  let emailServiceMock;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Crear mock del servicio de email
    emailServiceMock = new EmailServiceMock(
      EmailServiceMockFactory.createReliable()
    );

    // Configurar el mock de getEmailService
    getEmailService.mockResolvedValue(emailServiceMock);

    // Reset del mock del servicio
    emailServiceMock.reset();

    // Crear mocks de request y response
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendWelcomeEmail", () => {
    test("debe enviar email de bienvenida exitosamente", async () => {
      const welcomeData = EmailTestDataGenerator.createWelcomeEmailData();
      mockRequest.body = welcomeData;

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Email de bienvenida enviado exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("sendWelcomeEmail")).toBe(true);
      EmailMockAssertions.assertMethodCalledWith(
        emailServiceMock,
        "sendWelcomeEmail",
        [welcomeData.userEmail, welcomeData.userData]
      );
    });

    test("debe rechazar request sin userEmail", async () => {
      mockRequest.body = { userData: { name: "Test" } };

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "userEmail y userData son requeridos",
      });

      expect(emailServiceMock.wasMethodCalled("sendWelcomeEmail")).toBe(false);
    });

    test("debe rechazar request sin userData", async () => {
      mockRequest.body = { userEmail: "test@example.com" };

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "userEmail y userData son requeridos",
      });
    });

    test("debe manejar errores del servicio de email", async () => {
      // Simular error en sendWelcomeEmail directamente
      emailServiceMock.sendWelcomeEmail = jest
        .fn()
        .mockRejectedValue(new Error("Mock email send failure"));
      const welcomeData = EmailTestDataGenerator.createWelcomeEmailData();
      mockRequest.body = welcomeData;

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al enviar email de bienvenida",
        error: "Mock email send failure",
      });
    });
  });

  describe("sendPasswordResetEmail", () => {
    test("debe enviar email de recuperación exitosamente", async () => {
      const resetData = EmailTestDataGenerator.createPasswordResetData();
      mockRequest.body = resetData;

      await EmailController.sendPasswordResetEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Email de recuperación enviado exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("sendPasswordResetEmail")).toBe(
        true
      );
    });

    test("debe rechazar request con datos faltantes", async () => {
      mockRequest.body = { userEmail: "test@example.com" }; // Sin resetData

      await EmailController.sendPasswordResetEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "userEmail y resetData son requeridos",
      });
    });

    test("debe manejar errores del servicio", async () => {
      // Simular error en sendPasswordResetEmail directamente
      emailServiceMock.sendPasswordResetEmail = jest
        .fn()
        .mockRejectedValue(new Error("Mock password reset failure"));
      const resetData = EmailTestDataGenerator.createPasswordResetData();
      mockRequest.body = resetData;

      await EmailController.sendPasswordResetEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al enviar email de recuperación",
        error: "Mock password reset failure",
      });
    });
  });

  describe("sendVerificationEmail", () => {
    test("debe enviar email de verificación exitosamente", async () => {
      const verificationData = EmailTestDataGenerator.createVerificationData();
      mockRequest.body = verificationData;

      await EmailController.sendVerificationEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Email de verificación enviado exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("sendVerificationEmail")).toBe(
        true
      );
    });

    test("debe validar datos requeridos", async () => {
      mockRequest.body = {}; // Datos vacíos

      await EmailController.sendVerificationEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "userEmail y verificationData son requeridos",
      });
    });
  });

  describe("sendNotificationEmail", () => {
    test("debe enviar notificación exitosamente", async () => {
      const notificationData = EmailTestDataGenerator.createNotificationData();
      mockRequest.body = notificationData;

      await EmailController.sendNotificationEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Notificación enviada exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("sendNotificationEmail")).toBe(
        true
      );
    });

    test("debe validar datos de notificación", async () => {
      mockRequest.body = { userEmail: "test@example.com" }; // Sin notificationData

      await EmailController.sendNotificationEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("sendCustomEmail", () => {
    test("debe enviar email personalizado con template", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "Custom Email",
        template: "notification",
        data: { message: "Custom message" },
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Email enviado exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("queueEmail")).toBe(true);
    });

    test("debe enviar email personalizado con HTML", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "Custom HTML Email",
        html: "<h1>Custom HTML</h1><p>This is custom HTML content.</p>",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(emailServiceMock.wasMethodCalled("queueEmail")).toBe(true);
    });

    test("debe enviar email personalizado con texto plano", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "Plain Text Email",
        text: "This is plain text content.",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test("debe rechazar email sin destinatario", async () => {
      mockRequest.body = {
        subject: "Missing To",
        text: "This email has no recipient",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Los campos "to" y "subject" son requeridos',
      });
    });

    test("debe rechazar email sin asunto", async () => {
      mockRequest.body = {
        to: "test@example.com",
        text: "This email has no subject",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Los campos "to" y "subject" son requeridos',
      });
    });

    test("debe rechazar email sin contenido", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "No Content Email",
        // Sin template, html, o text
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Debe proporcionar template, html o text",
      });
    });

    test("debe manejar attachments y prioridad", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "Email with Attachments",
        text: "Email with attachments and priority",
        attachments: [{ filename: "test.txt", content: "test content" }],
        priority: "high",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const lastArgs = emailServiceMock.getLastCallArgs("queueEmail");
      expect(lastArgs[0].attachments).toBeDefined();
      expect(lastArgs[0].priority).toBe("high");
    });
  });

  describe("getEmailStats", () => {
    test("debe obtener estadísticas exitosamente", async () => {
      // Generar algo de actividad para tener estadísticas
      await emailServiceMock.send(EmailTestDataGenerator.createValidEmail());
      await emailServiceMock.validate("test@example.com");

      await EmailController.getEmailStats(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: expect.objectContaining({
          totalSent: expect.any(Number),
          totalFailed: expect.any(Number),
          templatesLoaded: expect.any(Number),
          provider: "mock",
        }),
      });
    });

    test("debe manejar errores al obtener estadísticas", async () => {
      // Simular error en getEmailService
      getEmailService.mockRejectedValueOnce(new Error("Service unavailable"));

      await EmailController.getEmailStats(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al obtener estadísticas",
        error: "Service unavailable",
      });
    });
  });

  describe("getEmailConfig", () => {
    test("debe obtener configuración exitosamente", async () => {
      await EmailController.getEmailConfig(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Configuración obtenida exitosamente",
        data: expect.objectContaining({
          provider: expect.any(String),
          templatesLoaded: expect.any(Number),
        }),
      });
    });

    test("debe manejar errores en configuración", async () => {
      getEmailService.mockRejectedValueOnce(new Error("Config error"));

      await EmailController.getEmailConfig(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe("testEmail", () => {
    test("debe enviar email de prueba exitosamente", async () => {
      mockRequest.body = { to: "test@example.com" };

      await EmailController.testEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Email de prueba enviado exitosamente",
        data: expect.any(Object),
      });

      expect(emailServiceMock.wasMethodCalled("queueEmail")).toBe(true);

      const lastArgs = emailServiceMock.getLastCallArgs("queueEmail");
      expect(lastArgs[0].to).toBe("test@example.com");
      expect(lastArgs[0].subject).toContain("Email de prueba");
    });

    test("debe rechazar test sin destinatario", async () => {
      mockRequest.body = {}; // Sin 'to'

      await EmailController.testEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'El campo "to" es requerido',
      });
    });

    test("debe manejar errores en email de prueba", async () => {
      // Simular error en queueEmail directamente
      emailServiceMock.queueEmail = jest
        .fn()
        .mockRejectedValue(new Error("Mock email send failure"));
      mockRequest.body = { to: "test@example.com" };

      await EmailController.testEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al enviar email de prueba",
        error: "Mock email send failure",
      });
    });
  });

  describe("getAvailableTemplates", () => {
    test("debe obtener templates disponibles", async () => {
      await EmailController.getAvailableTemplates(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Templates obtenidos exitosamente",
        data: expect.objectContaining({
          templates: expect.any(Array),
          count: expect.any(Number),
        }),
      });

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.data.templates).toContain("welcome");
      expect(responseCall.data.templates).toContain("notification");
    });

    test("debe manejar errores al obtener templates", async () => {
      getEmailService.mockRejectedValueOnce(new Error("Templates error"));

      await EmailController.getAvailableTemplates(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Validación de entrada", () => {
    test("debe manejar requests con body undefined", async () => {
      mockRequest.body = undefined;

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      // Cuando body es undefined, se produce un error 500 porque se intenta acceder a propiedades undefined
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test("debe manejar requests con body null", async () => {
      mockRequest.body = null;

      await EmailController.sendPasswordResetEmail(mockRequest, mockResponse);

      // Cuando body es null, se produce un error 500 porque se intenta acceder a propiedades null
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test("debe manejar campos con valores falsy", async () => {
      mockRequest.body = {
        userEmail: "",
        userData: null,
      };

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Manejo de errores del servicio", () => {
    test("debe manejar timeout del servicio", async () => {
      // Simular timeout rechazando directamente
      emailServiceMock.sendWelcomeEmail = jest
        .fn()
        .mockRejectedValue(new Error("Request timeout"));

      const welcomeData = EmailTestDataGenerator.createWelcomeEmailData();
      mockRequest.body = welcomeData;

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al enviar email de bienvenida",
        error: "Request timeout",
      });
    });

    test("debe manejar rate limit del servicio", async () => {
      // Simular rate limit rechazando directamente
      emailServiceMock.sendNotificationEmail = jest
        .fn()
        .mockRejectedValue(new Error("Rate limit excedido"));

      const customData = EmailTestDataGenerator.createNotificationData();
      mockRequest.body = customData;

      await EmailController.sendNotificationEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al enviar notificación",
        error: "Rate limit excedido",
      });
    });
  });

  describe("Integración con diferentes configuraciones", () => {
    test("debe funcionar con servicio lento", async () => {
      // Simular delay usando una promesa con setTimeout
      emailServiceMock.sendWelcomeEmail = jest
        .fn()
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            success: true,
            queueId: "test-queue-id",
            message: "Email agregado a la cola de envío",
          };
        });

      const welcomeData = EmailTestDataGenerator.createWelcomeEmailData();
      mockRequest.body = welcomeData;

      const startTime = Date.now();
      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(45); // Permitir algo de variación
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test("debe funcionar con servicio inestable", async () => {
      const results = { success: 0, error: 0 };

      // Intentar múltiples requests para probar inestabilidad
      for (let i = 0; i < 10; i++) {
        const freshMockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };

        // Simular comportamiento inestable - alternar entre éxito y fallo
        if (i % 2 === 0) {
          emailServiceMock.sendWelcomeEmail = jest.fn().mockResolvedValue({
            success: true,
            queueId: `test-${i}`,
            message: "Email agregado a la cola de envío",
          });
        } else {
          emailServiceMock.sendWelcomeEmail = jest
            .fn()
            .mockRejectedValue(new Error("Servicio inestable"));
        }

        mockRequest.body = EmailTestDataGenerator.createWelcomeEmailData();

        await EmailController.sendWelcomeEmail(mockRequest, freshMockResponse);

        if (freshMockResponse.status.mock.calls[0][0] === 200) {
          results.success++;
        } else {
          results.error++;
        }
      }

      // Con comportamiento alternante, deberían haber algunos de cada tipo
      expect(results.success).toBeGreaterThan(0);
      expect(results.error).toBeGreaterThan(0);
    });
  });

  describe("Casos edge", () => {
    test("debe manejar arrays en campos de destinatario", async () => {
      mockRequest.body = {
        to: ["test1@example.com", "test2@example.com"],
        subject: "Multiple Recipients",
        text: "Email to multiple recipients",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const lastArgs = emailServiceMock.getLastCallArgs("queueEmail");
      expect(
        Array.isArray(lastArgs[0].to) || typeof lastArgs[0].to === "string"
      ).toBe(true);
    });

    test("debe manejar datos con caracteres especiales", async () => {
      mockRequest.body = {
        to: "test@example.com",
        subject: "Título con acentós y ñoño",
        text: "Contenido con caracteres especiales: áéíóú ñ €",
      };

      await EmailController.sendCustomEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test("debe manejar objetos de datos complejos", async () => {
      const complexData = {
        userEmail: "complex@example.com",
        userData: {
          name: "Complex User",
          preferences: {
            language: "es",
            timezone: "Europe/Madrid",
            notifications: {
              email: true,
              sms: false,
            },
          },
          metadata: {
            source: "api",
            version: "2.0",
            tags: ["premium", "verified"],
          },
        },
      };

      mockRequest.body = complexData;

      await EmailController.sendWelcomeEmail(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const lastArgs = emailServiceMock.getLastCallArgs("sendWelcomeEmail");
      expect(lastArgs[1]).toEqual(complexData.userData);
    });
  });
});
