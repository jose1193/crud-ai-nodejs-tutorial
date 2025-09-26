/**
 * Tests de integración para la API de usuarios
 */

const request = require("supertest");
const app = require("../../app");
const { userRepository } = require("../../models/User");

describe("Users API Integration Tests", () => {
  beforeEach(() => {
    // Limpiar repositorio antes de cada test
    userRepository.users = [];
  });

  describe("POST /api/users", () => {
    test("debería crear un nuevo usuario con datos válidos", async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuario creado exitosamente");
      expect(response.body.data).toMatchObject({
        name: userData.name,
        email: userData.email,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.password).toBeUndefined(); // No debe incluir password
    });

    test("debería rechazar usuario con datos inválidos", async () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        password: "123",
      };

      const response = await request(app)
        .post("/api/users")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Error al crear usuario");
      expect(response.body.error).toContain("Datos inválidos");
    });

    test("debería rechazar email duplicado", async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      // Crear primer usuario
      await request(app).post("/api/users").send(userData).expect(201);

      // Intentar crear segundo usuario con mismo email
      const response = await request(app)
        .post("/api/users")
        .send({
          name: "Otro Usuario",
          email: "juan@example.com",
          password: "654321",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("El email ya está registrado");
    });

    test("debería rechazar request sin Content-Type JSON", async () => {
      const response = await request(app)
        .post("/api/users")
        .send("invalid data")
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("debería manejar campos faltantes", async () => {
      const incompleteData = {
        name: "Juan Pérez",
        // Falta email y password
      };

      const response = await request(app)
        .post("/api/users")
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Datos inválidos");
    });
  });

  describe("GET /api/users", () => {
    test("debería retornar lista vacía cuando no hay usuarios", async () => {
      const response = await request(app).get("/api/users").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuarios obtenidos exitosamente");
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    test("debería retornar todos los usuarios", async () => {
      // Crear usuarios de prueba
      const users = [
        { name: "Usuario 1", email: "user1@example.com", password: "123456" },
        { name: "Usuario 2", email: "user2@example.com", password: "123456" },
        { name: "Usuario 3", email: "user3@example.com", password: "123456" },
      ];

      for (const userData of users) {
        await request(app).post("/api/users").send(userData);
      }

      const response = await request(app).get("/api/users").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);

      // Verificar que no incluye passwords
      response.body.data.forEach((user) => {
        expect(user.password).toBeUndefined();
        expect(user.id).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.createdAt).toBeDefined();
      });
    });
  });

  describe("GET /api/users/:id", () => {
    let userId;

    beforeEach(async () => {
      const response = await request(app).post("/api/users").send({
        name: "Usuario Test",
        email: "test@example.com",
        password: "123456",
      });
      userId = response.body.data.id;
    });

    test("debería retornar usuario por ID válido", async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuario obtenido exitosamente");
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.name).toBe("Usuario Test");
      expect(response.body.data.email).toBe("test@example.com");
      expect(response.body.data.password).toBeUndefined();
    });

    test("debería retornar 404 para ID inexistente", async () => {
      const response = await request(app)
        .get("/api/users/non-existent-id")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Usuario no encontrado");
    });

    test("debería rechazar ID inválido (no UUID)", async () => {
      const response = await request(app)
        .get("/api/users/invalid-id-format")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/users/:id", () => {
    let userId;

    beforeEach(async () => {
      const response = await request(app).post("/api/users").send({
        name: "Usuario Original",
        email: "original@example.com",
        password: "123456",
      });
      userId = response.body.data.id;
    });

    test("debería actualizar usuario completamente", async () => {
      const updateData = {
        name: "Usuario Actualizado",
        email: "actualizado@example.com",
        password: "nueva123",
      };

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuario actualizado exitosamente");
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.password).toBeUndefined();
    });

    test("debería rechazar datos inválidos en actualización", async () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        password: "123",
      };

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Datos inválidos");
    });

    test("debería retornar 404 para ID inexistente", async () => {
      const response = await request(app)
        .put("/api/users/non-existent-id")
        .send({
          name: "Test",
          email: "test@example.com",
          password: "123456",
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Usuario no encontrado");
    });
  });

  describe("PATCH /api/users/:id", () => {
    let userId;

    beforeEach(async () => {
      const response = await request(app).post("/api/users").send({
        name: "Usuario Original",
        email: "original@example.com",
        password: "123456",
      });
      userId = response.body.data.id;
    });

    test("debería actualizar parcialmente solo el nombre", async () => {
      const updateData = {
        name: "Solo Nombre Actualizado",
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe("original@example.com"); // Sin cambios
    });

    test("debería actualizar parcialmente solo el email", async () => {
      const updateData = {
        email: "nuevo@example.com",
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.name).toBe("Usuario Original"); // Sin cambios
    });

    test("debería actualizar múltiples campos parcialmente", async () => {
      const updateData = {
        name: "Nuevo Nombre",
        password: "nueva456",
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe("original@example.com"); // Sin cambios
    });
  });

  describe("DELETE /api/users/:id", () => {
    let userId;

    beforeEach(async () => {
      const response = await request(app).post("/api/users").send({
        name: "Usuario a Eliminar",
        email: "eliminar@example.com",
        password: "123456",
      });
      userId = response.body.data.id;
    });

    test("debería eliminar usuario existente", async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuario eliminado exitosamente");

      // Verificar que fue eliminado
      await request(app).get(`/api/users/${userId}`).expect(404);
    });

    test("debería retornar 404 para ID inexistente", async () => {
      const response = await request(app)
        .delete("/api/users/non-existent-id")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Usuario no encontrado");
    });
  });

  describe("GET /api/users/search/email/:email", () => {
    beforeEach(async () => {
      await request(app).post("/api/users").send({
        name: "Usuario Buscable",
        email: "buscable@example.com",
        password: "123456",
      });
    });

    test("debería encontrar usuario por email existente", async () => {
      const response = await request(app)
        .get("/api/users/search/email/buscable@example.com")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Usuario encontrado exitosamente");
      expect(response.body.data.email).toBe("buscable@example.com");
      expect(response.body.data.name).toBe("Usuario Buscable");
    });

    test("debería retornar 404 para email inexistente", async () => {
      const response = await request(app)
        .get("/api/users/search/email/inexistente@example.com")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Usuario no encontrado con ese email");
    });
  });

  describe("GET /api/users/stats", () => {
    test("debería retornar estadísticas correctas", async () => {
      // Crear usuarios de prueba
      const users = [
        { name: "Usuario 1", email: "user1@example.com", password: "123456" },
        { name: "Usuario 2", email: "user2@example.com", password: "123456" },
        { name: "Usuario 3", email: "user3@example.com", password: "123456" },
      ];

      for (const userData of users) {
        await request(app).post("/api/users").send(userData);
      }

      const response = await request(app).get("/api/users/stats").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Estadísticas obtenidas exitosamente");
      expect(response.body.data.totalUsers).toBe(3);
      expect(response.body.data.usersCreatedToday).toBe(3);
      expect(response.body.data.usersCreatedThisWeek).toBe(3);
    });

    test("debería retornar estadísticas vacías cuando no hay usuarios", async () => {
      const response = await request(app).get("/api/users/stats").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBe(0);
      expect(response.body.data.usersCreatedToday).toBe(0);
      expect(response.body.data.usersCreatedThisWeek).toBe(0);
    });
  });

  describe("Casos extremos y límites", () => {
    test("debería manejar nombre con caracteres especiales", async () => {
      const userData = {
        name: "José María Ñoño-Pérez",
        email: "jose@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(201);

      expect(response.body.data.name).toBe(userData.name);
    });

    test("debería manejar email con subdominios", async () => {
      const userData = {
        name: "Usuario Test",
        email: "test@subdomain.example.co.uk",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(201);

      expect(response.body.data.email).toBe(userData.email);
    });

    test("debería manejar contraseña con caracteres especiales", async () => {
      const userData = {
        name: "Usuario Test",
        email: "test@example.com",
        password: "P@ssw0rd!#$%",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test("debería manejar nombres en el límite de caracteres", async () => {
      const userData = {
        name: "A".repeat(50), // Máximo permitido
        email: "limite@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(201);

      expect(response.body.data.name).toBe(userData.name);
    });

    test("debería rechazar nombres que exceden el límite", async () => {
      const userData = {
        name: "A".repeat(51), // Excede el límite
        email: "exceso@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/users")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Manejo de errores del servidor", () => {
    test("debería manejar JSON malformado", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Content-Type", "application/json")
        .send('{"name": "Test", "email": "test@example.com", "password":}') // JSON inválido
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test("debería manejar Content-Type incorrecto", async () => {
      const response = await request(app)
        .post("/api/users")
        .set("Content-Type", "text/plain")
        .send("not json data")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
