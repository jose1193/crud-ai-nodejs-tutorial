/**
 * Tests unitarios para UserController con mocks
 */

const UserController = require("../../controllers/userController");
const { userRepository } = require("../../models/User");
const {
  emailServiceMock,
  getEmailServiceMock,
} = require("../mocks/emailService.mock");

// Mock del emailService
jest.mock("../../services/emailService", () => ({
  getEmailService: jest.fn(),
}));

const { getEmailService } = require("../../services/emailService");

describe("UserController", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Limpiar repositorio
    userRepository.users = [];

    // Limpiar mocks
    emailServiceMock.reset();
    getEmailService.mockResolvedValue(emailServiceMock);

    // Setup mock request y response
    mockReq = {
      body: {},
      params: {},
      ip: "127.0.0.1",
      get: jest.fn().mockReturnValue("Test User Agent"),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Limpiar console mocks
    console.log.mockClear();
    console.warn.mockClear();
  });

  describe("create", () => {
    test("debería crear usuario exitosamente con email configurado", async () => {
      // Configurar variables de entorno para email
      process.env.GMAIL_USER = "test@gmail.com";
      process.env.GMAIL_APP_PASSWORD = "test-password";

      mockReq.body = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario creado exitosamente",
        data: expect.objectContaining({
          name: "Juan Pérez",
          email: "juan@example.com",
          id: expect.any(String),
          createdAt: expect.any(String),
        }),
      });

      // Verificar que se intentó enviar email
      expect(emailServiceMock.getCallCount()).toBe(1);
      expect(
        emailServiceMock.wasCalledWith("sendWelcomeEmail", "juan@example.com")
      ).toBe(true);

      // Limpiar variables de entorno
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
    });

    test("debería crear usuario exitosamente sin email configurado", async () => {
      // Asegurar que no hay configuración de email
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;

      mockReq.body = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario creado exitosamente",
        data: expect.objectContaining({
          name: "Juan Pérez",
          email: "juan@example.com",
        }),
      });

      // Verificar que NO se intentó enviar email
      expect(emailServiceMock.getCallCount()).toBe(0);
    });

    test("debería crear usuario aunque falle el envío de email", async () => {
      process.env.GMAIL_USER = "test@gmail.com";
      process.env.GMAIL_APP_PASSWORD = "test-password";

      // Configurar mock para fallar
      emailServiceMock.setFailure(true, "Email service unavailable");

      mockReq.body = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario creado exitosamente",
        data: expect.objectContaining({
          name: "Juan Pérez",
          email: "juan@example.com",
        }),
      });

      // Verificar que se intentó enviar email pero falló
      expect(emailServiceMock.getCallCount()).toBe(1);

      // Limpiar
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
    });

    test("debería rechazar datos inválidos", async () => {
      mockReq.body = {
        name: "",
        email: "invalid-email",
        password: "123",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al crear usuario",
        error: expect.stringContaining("Datos inválidos"),
      });

      // No debe intentar enviar email
      expect(emailServiceMock.getCallCount()).toBe(0);
    });

    test("debería manejar email duplicado", async () => {
      // Crear primer usuario
      userRepository.create({
        name: "Primer Usuario",
        email: "duplicado@example.com",
        password: "123456",
      });

      mockReq.body = {
        name: "Segundo Usuario",
        email: "duplicado@example.com",
        password: "654321",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al crear usuario",
        error: "El email ya está registrado",
      });
    });
  });

  describe("getAll", () => {
    test("debería retornar lista vacía cuando no hay usuarios", async () => {
      await UserController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: [],
        count: 0,
      });
    });

    test("debería retornar todos los usuarios", async () => {
      // Crear usuarios de prueba
      userRepository.create({
        name: "Usuario 1",
        email: "user1@example.com",
        password: "123456",
      });
      userRepository.create({
        name: "Usuario 2",
        email: "user2@example.com",
        password: "123456",
      });

      await UserController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: expect.arrayContaining([
          expect.objectContaining({
            name: "Usuario 1",
            email: "user1@example.com",
          }),
          expect.objectContaining({
            name: "Usuario 2",
            email: "user2@example.com",
          }),
        ]),
        count: 2,
      });
    });
  });

  describe("getById", () => {
    let userId;

    beforeEach(() => {
      const user = userRepository.create({
        name: "Usuario Test",
        email: "test@example.com",
        password: "123456",
      });
      userId = user.id;
    });

    test("debería retornar usuario por ID válido", async () => {
      mockReq.params.id = userId;

      await UserController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario obtenido exitosamente",
        data: expect.objectContaining({
          id: userId,
          name: "Usuario Test",
          email: "test@example.com",
        }),
      });
    });

    test("debería retornar 404 para ID inexistente", async () => {
      mockReq.params.id = "non-existent-id";

      await UserController.getById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Usuario no encontrado",
      });
    });
  });

  describe("update", () => {
    let userId;

    beforeEach(() => {
      const user = userRepository.create({
        name: "Usuario Original",
        email: "original@example.com",
        password: "123456",
      });
      userId = user.id;
    });

    test("debería actualizar usuario exitosamente", async () => {
      mockReq.params.id = userId;
      mockReq.body = {
        name: "Usuario Actualizado",
        email: "actualizado@example.com",
        password: "nueva123",
      };

      await UserController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: expect.objectContaining({
          id: userId,
          name: "Usuario Actualizado",
          email: "actualizado@example.com",
        }),
      });
    });

    test("debería filtrar campos no actualizables", async () => {
      mockReq.params.id = userId;
      mockReq.body = {
        name: "Usuario Actualizado",
        id: "nuevo-id-malicioso",
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      await UserController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0].data;
      expect(responseData.id).toBe(userId); // ID original
      expect(responseData.name).toBe("Usuario Actualizado");
    });

    test("debería retornar 404 para ID inexistente", async () => {
      mockReq.params.id = "non-existent-id";
      mockReq.body = { name: "Test" };

      await UserController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Usuario no encontrado",
      });
    });
  });

  describe("delete", () => {
    let userId;

    beforeEach(() => {
      const user = userRepository.create({
        name: "Usuario a Eliminar",
        email: "eliminar@example.com",
        password: "123456",
      });
      userId = user.id;
    });

    test("debería eliminar usuario exitosamente", async () => {
      mockReq.params.id = userId;

      await UserController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario eliminado exitosamente",
      });

      // Verificar que fue eliminado
      expect(userRepository.findById(userId)).toBeUndefined();
    });

    test("debería retornar 404 para ID inexistente", async () => {
      mockReq.params.id = "non-existent-id";

      await UserController.delete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Usuario no encontrado",
      });
    });
  });

  describe("findByEmail", () => {
    beforeEach(() => {
      userRepository.create({
        name: "Usuario Buscable",
        email: "buscable@example.com",
        password: "123456",
      });
    });

    test("debería encontrar usuario por email", async () => {
      mockReq.params.email = "buscable@example.com";

      await UserController.findByEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Usuario encontrado exitosamente",
        data: expect.objectContaining({
          email: "buscable@example.com",
          name: "Usuario Buscable",
        }),
      });
    });

    test("debería retornar 404 para email inexistente", async () => {
      mockReq.params.email = "inexistente@example.com";

      await UserController.findByEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Usuario no encontrado con ese email",
      });
    });
  });

  describe("getStats", () => {
    test("debería retornar estadísticas correctas", async () => {
      // Crear usuarios de prueba
      userRepository.create({
        name: "Usuario 1",
        email: "user1@example.com",
        password: "123456",
      });
      userRepository.create({
        name: "Usuario 2",
        email: "user2@example.com",
        password: "123456",
      });
      userRepository.create({
        name: "Usuario 3",
        email: "user3@example.com",
        password: "123456",
      });

      await UserController.getStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: {
          totalUsers: 3,
          usersCreatedToday: 3,
          usersCreatedThisWeek: 3,
        },
      });
    });

    test("debería retornar estadísticas vacías", async () => {
      await UserController.getStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: {
          totalUsers: 0,
          usersCreatedToday: 0,
          usersCreatedThisWeek: 0,
        },
      });
    });
  });

  describe("Casos extremos", () => {
    test("debería manejar errores inesperados en create", async () => {
      // Forzar error en el repositorio
      const originalCreate = userRepository.create;
      userRepository.create = jest.fn().mockImplementation(() => {
        throw new Error("Error inesperado del repositorio");
      });

      mockReq.body = {
        name: "Test User",
        email: "test@example.com",
        password: "123456",
      };

      await UserController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al crear usuario",
        error: "Error inesperado del repositorio",
      });

      // Restaurar método original
      userRepository.create = originalCreate;
    });

    test("debería manejar errores inesperados en getAll", async () => {
      // Forzar error en el repositorio
      const originalFindAll = userRepository.findAll;
      userRepository.findAll = jest.fn().mockImplementation(() => {
        throw new Error("Error al acceder a la base de datos");
      });

      await UserController.getAll(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Error al obtener usuarios",
        error: "Error al acceder a la base de datos",
      });

      // Restaurar método original
      userRepository.findAll = originalFindAll;
    });
  });
});
