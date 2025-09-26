const request = require("supertest");
const app = require("../../app");
const { UserRepository } = require("../../models/User");

/**
 * Tests de integración completos para la API de usuarios
 * Incluye todos los endpoints CRUD, búsqueda, estadísticas y casos extremos
 */
describe("User API Integration Tests", () => {
  let server;
  let userRepository;

  beforeAll((done) => {
    server = app.listen(0, () => {
      // Puerto dinámico para evitar conflictos
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Limpiar repositorio antes de cada test
    userRepository = new UserRepository();
    // Reemplazar la instancia global con una nueva para cada test
    const userModel = require("../../models/User");
    userModel.userRepository.users = [];
  });

  describe("POST /api/users - Crear usuario", () => {
    describe("Casos de éxito", () => {
      test("debe crear usuario válido correctamente", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuario creado exitosamente",
          data: {
            name: "Juan Pérez",
            email: "juan@example.com",
            id: expect.any(String),
            createdAt: expect.any(String),
          },
        });

        // Verificar que no se devuelve la contraseña
        expect(response.body.data.password).toBeUndefined();

        // Verificar formato UUID del ID
        expect(response.body.data.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );

        // Verificar formato ISO de fecha
        expect(new Date(response.body.data.createdAt).toISOString()).toBe(
          response.body.data.createdAt
        );
      });

      test("debe crear usuario con caracteres especiales", async () => {
        const userData = {
          name: "José María Ñoño",
          email: "jose.maria@dominio-español.com",
          password: "contraseña123!@#",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.data.name).toBe("José María Ñoño");
        expect(response.body.data.email).toBe("jose.maria@dominio-español.com");
      });

      test("debe crear usuario con límites exactos", async () => {
        const userData = {
          name: "Ab", // 2 caracteres (mínimo)
          email: "a@b.c", // Email mínimo válido
          password: "123456", // 6 caracteres (mínimo)
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.data.name).toBe("Ab");
        expect(response.body.data.email).toBe("a@b.c");
      });

      test("debe crear usuario con límites máximos", async () => {
        const userData = {
          name: "a".repeat(50), // 50 caracteres (máximo)
          email: "test@example.com",
          password: "a".repeat(100), // 100 caracteres (máximo)
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.data.name).toBe("a".repeat(50));
      });
    });

    describe("Casos de error - Validación", () => {
      test("debe rechazar usuario sin nombre", async () => {
        const userData = {
          email: "test@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: "Datos de usuario inválidos",
          errors: expect.arrayContaining([
            "El nombre es requerido y debe ser una cadena de texto",
          ]),
        });
      });

      test("debe rechazar usuario sin email", async () => {
        const userData = {
          name: "Juan Pérez",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain("El email es requerido");
      });

      test("debe rechazar usuario sin contraseña", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain("La contraseña es requerida");
      });

      test("debe rechazar nombre muy corto", async () => {
        const userData = {
          name: "A", // 1 carácter
          email: "test@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "El nombre debe tener al menos 2 caracteres"
        );
      });

      test("debe rechazar nombre muy largo", async () => {
        const userData = {
          name: "a".repeat(51), // 51 caracteres
          email: "test@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "El nombre no puede exceder los 50 caracteres"
        );
      });

      test("debe rechazar email inválido", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "email-invalido",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "El formato del email no es válido"
        );
      });

      test("debe rechazar contraseña muy corta", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "12345", // 5 caracteres
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "La contraseña debe tener al menos 6 caracteres"
        );
      });

      test("debe rechazar contraseña muy larga", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "a".repeat(101), // 101 caracteres
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "La contraseña no puede exceder los 100 caracteres"
        );
      });

      test("debe rechazar múltiples errores simultáneamente", async () => {
        const userData = {
          name: "", // Vacío
          email: "email-invalido", // Formato inválido
          password: "123", // Muy corta
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toHaveLength(3);
        expect(response.body.errors).toContain(
          "El nombre es requerido y debe ser una cadena de texto"
        );
        expect(response.body.errors).toContain(
          "El formato del email no es válido"
        );
        expect(response.body.errors).toContain(
          "La contraseña debe tener al menos 6 caracteres"
        );
      });
    });

    describe("Casos de error - Email duplicado", () => {
      test("debe rechazar email duplicado", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "123456",
        };

        // Crear primer usuario
        await request(app).post("/api/users").send(userData).expect(201);

        // Intentar crear segundo usuario con mismo email
        const userData2 = {
          name: "María García",
          email: "juan@example.com", // Email duplicado
          password: "654321",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData2)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: "Error al crear usuario",
          error: expect.stringContaining("El email ya está registrado"),
        });
      });
    });

    describe("Casos de error - JSON inválido", () => {
      test("debe rechazar JSON malformado", async () => {
        const response = await request(app)
          .post("/api/users")
          .send('{"name": "Juan", "email":}') // JSON inválido
          .set("Content-Type", "application/json")
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test("debe rechazar tipos de datos incorrectos", async () => {
        const userData = {
          name: 123, // Debería ser string
          email: ["test@example.com"], // Debería ser string
          password: { pass: "123456" }, // Debería ser string
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.errors).toContain(
          "El nombre es requerido y debe ser una cadena de texto"
        );
        expect(response.body.errors).toContain("El email es requerido");
        expect(response.body.errors).toContain("La contraseña es requerida");
      });
    });
  });

  describe("GET /api/users - Obtener todos los usuarios", () => {
    describe("Casos de éxito", () => {
      test("debe retornar array vacío cuando no hay usuarios", async () => {
        const response = await request(app).get("/api/users").expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuarios obtenidos exitosamente",
          data: [],
          count: 0,
        });
      });

      test("debe retornar todos los usuarios", async () => {
        // Crear usuarios de prueba
        const users = [
          { name: "Juan Pérez", email: "juan@example.com", password: "123456" },
          {
            name: "María García",
            email: "maria@example.com",
            password: "654321",
          },
          {
            name: "Carlos López",
            email: "carlos@example.com",
            password: "abcdef",
          },
        ];

        for (const userData of users) {
          await request(app).post("/api/users").send(userData);
        }

        const response = await request(app).get("/api/users").expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuarios obtenidos exitosamente",
          count: 3,
        });

        expect(response.body.data).toHaveLength(3);
        expect(response.body.data[0]).toHaveProperty("id");
        expect(response.body.data[0]).toHaveProperty("name");
        expect(response.body.data[0]).toHaveProperty("email");
        expect(response.body.data[0]).toHaveProperty("createdAt");
        expect(response.body.data[0]).not.toHaveProperty("password");
      });

      test("debe mantener orden de creación", async () => {
        const users = [
          { name: "Usuario 1", email: "user1@example.com", password: "123456" },
          { name: "Usuario 2", email: "user2@example.com", password: "123456" },
          { name: "Usuario 3", email: "user3@example.com", password: "123456" },
        ];

        for (const userData of users) {
          await request(app).post("/api/users").send(userData);
        }

        const response = await request(app).get("/api/users").expect(200);

        expect(response.body.data[0].name).toBe("Usuario 1");
        expect(response.body.data[1].name).toBe("Usuario 2");
        expect(response.body.data[2].name).toBe("Usuario 3");
      });
    });
  });

  describe("GET /api/users/:id - Obtener usuario por ID", () => {
    let createdUser;

    beforeEach(async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app).post("/api/users").send(userData);

      createdUser = response.body.data;
    });

    describe("Casos de éxito", () => {
      test("debe obtener usuario existente por ID", async () => {
        const response = await request(app)
          .get(`/api/users/${createdUser.id}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuario obtenido exitosamente",
          data: {
            id: createdUser.id,
            name: "Juan Pérez",
            email: "juan@example.com",
            createdAt: expect.any(String),
          },
        });

        expect(response.body.data.password).toBeUndefined();
      });
    });

    describe("Casos de error", () => {
      test("debe retornar 404 para ID inexistente", async () => {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000";

        const response = await request(app)
          .get(`/api/users/${fakeId}`)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          message: "Usuario no encontrado",
        });
      });

      test("debe manejar ID con formato inválido", async () => {
        const invalidId = "id-invalido";

        const response = await request(app)
          .get(`/api/users/${invalidId}`)
          .expect(400); // Cambiado de 404 a 400 porque es un error de validación

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Formato de ID inválido");
      });

      test("debe manejar ID vacío", async () => {
        const response = await request(app).get("/api/users/").expect(200); // Debería ir a GET /api/users (obtener todos)

        expect(response.body.message).toBe("Usuarios obtenidos exitosamente");
      });
    });
  });

  describe("PUT /api/users/:id - Actualizar usuario completo", () => {
    let createdUser;

    beforeEach(async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app).post("/api/users").send(userData);

      createdUser = response.body.data;
    });

    describe("Casos de éxito", () => {
      test("debe actualizar usuario completo", async () => {
        const updateData = {
          name: "Juan Carlos Pérez",
          email: "juancarlos@example.com",
          password: "newpassword123",
        };

        const response = await request(app)
          .put(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuario actualizado exitosamente",
          data: {
            id: createdUser.id,
            name: "Juan Carlos Pérez",
            email: "juancarlos@example.com",
            createdAt: createdUser.createdAt,
          },
        });

        expect(response.body.data.password).toBeUndefined();
      });

      test("debe actualizar solo un campo", async () => {
        const updateData = {
          name: "Nuevo Nombre",
        };

        const response = await request(app)
          .put(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.name).toBe("Nuevo Nombre");
        expect(response.body.data.email).toBe("juan@example.com"); // Sin cambios
      });

      test("debe ignorar campos no actualizables", async () => {
        const updateData = {
          name: "Nuevo Nombre",
          id: "nuevo-id-malicioso",
          createdAt: "2020-01-01T00:00:00.000Z",
        };

        const response = await request(app)
          .put(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.id).toBe(createdUser.id); // ID original
        expect(response.body.data.createdAt).toBe(createdUser.createdAt); // Fecha original
        expect(response.body.data.name).toBe("Nuevo Nombre"); // Campo actualizado
      });
    });

    describe("Casos de error", () => {
      test("debe retornar 404 para ID inexistente", async () => {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000";
        const updateData = { name: "Nuevo Nombre" };

        const response = await request(app)
          .put(`/api/users/${fakeId}`)
          .send(updateData)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          message: "Usuario no encontrado",
        });
      });

      test("debe rechazar datos inválidos", async () => {
        const updateData = {
          name: "", // Nombre vacío
          email: "email-invalido",
        };

        const response = await request(app)
          .put(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Datos de actualización inválidos");
      });

      test("debe rechazar email duplicado", async () => {
        // Crear segundo usuario
        const userData2 = {
          name: "María García",
          email: "maria@example.com",
          password: "654321",
        };

        await request(app).post("/api/users").send(userData2);

        // Intentar actualizar primer usuario con email del segundo
        const updateData = {
          email: "maria@example.com",
        };

        const response = await request(app)
          .put(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error).toContain("El email ya está registrado");
      });
    });
  });

  describe("PATCH /api/users/:id - Actualizar usuario parcial", () => {
    let createdUser;

    beforeEach(async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app).post("/api/users").send(userData);

      createdUser = response.body.data;
    });

    describe("Casos de éxito", () => {
      test("debe actualizar parcialmente solo nombre", async () => {
        const updateData = {
          name: "Juan Carlos",
        };

        const response = await request(app)
          .patch(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.name).toBe("Juan Carlos");
        expect(response.body.data.email).toBe("juan@example.com"); // Sin cambios
      });

      test("debe actualizar parcialmente solo email", async () => {
        const updateData = {
          email: "nuevo@example.com",
        };

        const response = await request(app)
          .patch(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.email).toBe("nuevo@example.com");
        expect(response.body.data.name).toBe("Juan Pérez"); // Sin cambios
      });

      test("debe actualizar parcialmente solo contraseña", async () => {
        const updateData = {
          password: "nuevapassword",
        };

        const response = await request(app)
          .patch(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.name).toBe("Juan Pérez"); // Sin cambios
        expect(response.body.data.email).toBe("juan@example.com"); // Sin cambios
        // La contraseña no se devuelve en la respuesta
      });

      test("debe rechazar actualización con objeto vacío", async () => {
        const response = await request(app)
          .patch(`/api/users/${createdUser.id}`)
          .send({})
          .expect(400); // Cambiado a 400 porque el middleware requiere al menos un campo

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
          "No se proporcionaron campos válidos para actualizar"
        );
      });
    });

    describe("Casos de error", () => {
      test("debe retornar 404 para ID inexistente", async () => {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000";

        const response = await request(app)
          .patch(`/api/users/${fakeId}`)
          .send({ name: "Nuevo Nombre" })
          .expect(404);

        expect(response.body.message).toBe("Usuario no encontrado");
      });

      test("debe rechazar datos parciales inválidos", async () => {
        const updateData = {
          name: "A", // Muy corto
        };

        const response = await request(app)
          .patch(`/api/users/${createdUser.id}`)
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("DELETE /api/users/:id - Eliminar usuario", () => {
    let createdUser;

    beforeEach(async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app).post("/api/users").send(userData);

      createdUser = response.body.data;
    });

    describe("Casos de éxito", () => {
      test("debe eliminar usuario existente", async () => {
        const response = await request(app)
          .delete(`/api/users/${createdUser.id}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuario eliminado exitosamente",
        });

        // Verificar que el usuario ya no existe
        await request(app).get(`/api/users/${createdUser.id}`).expect(404);
      });

      test("debe eliminar usuario correcto entre múltiples", async () => {
        // Crear usuarios adicionales
        const userData2 = {
          name: "María García",
          email: "maria@example.com",
          password: "654321",
        };
        const userData3 = {
          name: "Carlos López",
          email: "carlos@example.com",
          password: "abcdef",
        };

        const user2Response = await request(app)
          .post("/api/users")
          .send(userData2);
        const user3Response = await request(app)
          .post("/api/users")
          .send(userData3);

        // Eliminar usuario del medio
        await request(app)
          .delete(`/api/users/${user2Response.body.data.id}`)
          .expect(200);

        // Verificar que los otros usuarios siguen existiendo
        await request(app).get(`/api/users/${createdUser.id}`).expect(200);

        await request(app)
          .get(`/api/users/${user3Response.body.data.id}`)
          .expect(200);

        // Verificar que el eliminado no existe
        await request(app)
          .get(`/api/users/${user2Response.body.data.id}`)
          .expect(404);
      });
    });

    describe("Casos de error", () => {
      test("debe retornar 404 para ID inexistente", async () => {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000";

        const response = await request(app)
          .delete(`/api/users/${fakeId}`)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          message: "Usuario no encontrado",
        });
      });

      test("debe manejar eliminación múltiple del mismo usuario", async () => {
        // Primera eliminación - debe funcionar
        await request(app).delete(`/api/users/${createdUser.id}`).expect(200);

        // Segunda eliminación del mismo usuario - debe fallar
        await request(app).delete(`/api/users/${createdUser.id}`).expect(404);
      });
    });
  });

  describe("GET /api/users/search/email/:email - Buscar por email", () => {
    let createdUser;

    beforeEach(async () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const response = await request(app).post("/api/users").send(userData);

      createdUser = response.body.data;
    });

    describe("Casos de éxito", () => {
      test("debe encontrar usuario por email existente", async () => {
        const response = await request(app)
          .get("/api/users/search/email/juan@example.com")
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Usuario encontrado exitosamente",
          data: {
            id: createdUser.id,
            name: "Juan Pérez",
            email: "juan@example.com",
            createdAt: expect.any(String),
          },
        });

        expect(response.body.data.password).toBeUndefined();
      });

      test("debe encontrar usuario con email que contiene caracteres especiales", async () => {
        const userData = {
          name: "José María",
          email: "jose.maria+test@dominio-español.com",
          password: "123456",
        };

        await request(app).post("/api/users").send(userData);

        const response = await request(app)
          .get("/api/users/search/email/jose.maria+test@dominio-español.com")
          .expect(200);

        expect(response.body.data.email).toBe(
          "jose.maria+test@dominio-español.com"
        );
      });
    });

    describe("Casos de error", () => {
      test("debe retornar 404 para email inexistente", async () => {
        const response = await request(app)
          .get("/api/users/search/email/inexistente@example.com")
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          message: "Usuario no encontrado con ese email",
        });
      });

      test("debe ser case-sensitive para emails", async () => {
        const response = await request(app)
          .get("/api/users/search/email/JUAN@EXAMPLE.COM")
          .expect(404);

        expect(response.body.message).toBe(
          "Usuario no encontrado con ese email"
        );
      });

      test("debe manejar emails con caracteres especiales en URL", async () => {
        const email = "test+special@example.com";
        const encodedEmail = encodeURIComponent(email);

        const response = await request(app)
          .get(`/api/users/search/email/${encodedEmail}`)
          .expect(404); // No existe este usuario

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("GET /api/users/stats - Estadísticas de usuarios", () => {
    describe("Casos de éxito", () => {
      test("debe retornar estadísticas con cero usuarios", async () => {
        const response = await request(app).get("/api/users/stats").expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: "Estadísticas obtenidas exitosamente",
          data: {
            totalUsers: 0,
            usersCreatedToday: 0,
            usersCreatedThisWeek: 0,
          },
        });
      });

      test("debe calcular estadísticas correctamente con usuarios", async () => {
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

        expect(response.body.data).toMatchObject({
          totalUsers: 3,
          usersCreatedToday: 3, // Todos creados hoy
          usersCreatedThisWeek: 3, // Todos creados esta semana
        });
      });

      test("debe incluir todas las propiedades de estadísticas", async () => {
        const response = await request(app).get("/api/users/stats").expect(200);

        expect(response.body.data).toHaveProperty("totalUsers");
        expect(response.body.data).toHaveProperty("usersCreatedToday");
        expect(response.body.data).toHaveProperty("usersCreatedThisWeek");

        // Verificar que son números
        expect(typeof response.body.data.totalUsers).toBe("number");
        expect(typeof response.body.data.usersCreatedToday).toBe("number");
        expect(typeof response.body.data.usersCreatedThisWeek).toBe("number");
      });
    });
  });

  describe("Casos extremos y manejo de errores del servidor", () => {
    describe("Límites y caracteres especiales", () => {
      test("debe manejar nombres con emojis", async () => {
        const userData = {
          name: "Juan 😊 Pérez",
          email: "juan.emoji@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.data.name).toBe("Juan 😊 Pérez");
      });

      test("debe manejar emails con subdominios múltiples", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@mail.subdomain.example.co.uk",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.data.email).toBe(
          "juan@mail.subdomain.example.co.uk"
        );
      });

      test("debe manejar contraseñas con todos los caracteres especiales", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "!@#$%^&*()_+-=[]{}|;:,.<>?",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test("debe manejar nombres con espacios múltiples", async () => {
        const userData = {
          name: "  Juan    Pérez  ",
          email: "juan@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        // El nombre se guarda tal como se envía (el middleware puede hacer trim)
        expect(response.body.data.name).toBeTruthy();
      });
    });

    describe("Payloads grandes y límites", () => {
      test("debe manejar payload muy grande", async () => {
        const userData = {
          name: "a".repeat(50), // Máximo permitido
          email: "test@example.com",
          password: "a".repeat(100), // Máximo permitido
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test("debe rechazar payload excesivamente grande", async () => {
        const userData = {
          name: "a".repeat(1000), // Muy grande
          email: "test@example.com",
          password: "a".repeat(1000), // Muy grande
        };

        const response = await request(app)
          .post("/api/users")
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("Headers y Content-Type", () => {
      test("debe manejar Content-Type incorrecto", async () => {
        const userData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "123456",
        };

        const response = await request(app)
          .post("/api/users")
          .send(JSON.stringify(userData))
          .set("Content-Type", "text/plain")
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test("debe manejar ausencia de Content-Type", async () => {
        const response = await request(app)
          .post("/api/users")
          .send(
            '{"name":"Juan","email":"juan@example.com","password":"123456"}'
          )
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe("Concurrencia y operaciones simultáneas", () => {
      test("debe manejar múltiples creaciones simultáneas", async () => {
        const promises = [];

        for (let i = 0; i < 5; i++) {
          const userData = {
            name: `Usuario ${i}`,
            email: `user${i}@example.com`,
            password: "123456",
          };

          promises.push(request(app).post("/api/users").send(userData));
        }

        const responses = await Promise.all(promises);

        // Todos deberían ser exitosos
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        });

        // Verificar que se crearon todos los usuarios
        const allUsersResponse = await request(app)
          .get("/api/users")
          .expect(200);

        expect(allUsersResponse.body.count).toBe(5);
      });

      test("debe manejar operaciones CRUD simultáneas", async () => {
        // Crear usuario inicial
        const initialUser = await request(app).post("/api/users").send({
          name: "Usuario Inicial",
          email: "inicial@example.com",
          password: "123456",
        });

        const userId = initialUser.body.data.id;

        // Operaciones simultáneas
        const promises = [
          request(app).get(`/api/users/${userId}`), // Leer
          request(app)
            .patch(`/api/users/${userId}`)
            .send({ name: "Nombre Actualizado" }), // Actualizar
          request(app).get("/api/users"), // Listar todos
          request(app).get("/api/users/stats"), // Estadísticas
        ];

        const responses = await Promise.all(promises);

        // Al menos algunas operaciones deberían ser exitosas
        const successfulResponses = responses.filter((r) => r.status === 200);
        expect(successfulResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Rutas no encontradas y métodos no soportados", () => {
    test("debe retornar 400 para rutas con formato inválido", async () => {
      const response = await request(app)
        .get("/api/users/ruta-inexistente")
        .expect(400); // Es un error de validación de ID

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Formato de ID inválido");
    });

    test("debe manejar métodos HTTP HEAD correctamente", async () => {
      // HEAD debería funcionar igual que GET pero sin body
      const response = await request(app).head("/api/users").expect(200); // HEAD para /api/users debería funcionar

      expect(response.body).toEqual({}); // HEAD no devuelve body
    });
  });

  describe("Validación de códigos de estado HTTP", () => {
    test("debe retornar códigos de estado correctos para todas las operaciones", async () => {
      // POST - Creación exitosa
      const createResponse = await request(app)
        .post("/api/users")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "123456",
        });
      expect(createResponse.status).toBe(201);

      const userId = createResponse.body.data.id;

      // GET - Lectura exitosa
      const getResponse = await request(app).get(`/api/users/${userId}`);
      expect(getResponse.status).toBe(200);

      // PUT - Actualización exitosa
      const putResponse = await request(app)
        .put(`/api/users/${userId}`)
        .send({
          name: "Updated User",
          email: "updated@example.com",
          password: "newpass",
        });
      expect(putResponse.status).toBe(200);

      // PATCH - Actualización parcial exitosa
      const patchResponse = await request(app)
        .patch(`/api/users/${userId}`)
        .send({ name: "Partially Updated" });
      expect(patchResponse.status).toBe(200);

      // DELETE - Eliminación exitosa
      const deleteResponse = await request(app).delete(`/api/users/${userId}`);
      expect(deleteResponse.status).toBe(200);

      // GET después de DELETE - No encontrado
      const getAfterDeleteResponse = await request(app).get(
        `/api/users/${userId}`
      );
      expect(getAfterDeleteResponse.status).toBe(404);
    });

    test("debe retornar códigos de error apropiados", async () => {
      // 400 - Bad Request (datos inválidos)
      const badRequestResponse = await request(app)
        .post("/api/users")
        .send({ name: "", email: "invalid", password: "123" });
      expect(badRequestResponse.status).toBe(400);

      // 404 - Not Found
      const notFoundResponse = await request(app).get(
        "/api/users/123e4567-e89b-12d3-a456-426614174000"
      );
      expect(notFoundResponse.status).toBe(404);
    });
  });

  describe("Formato de respuesta JSON", () => {
    test("todas las respuestas deben tener formato JSON válido", async () => {
      const endpoints = [
        { method: "get", path: "/api/users" },
        { method: "get", path: "/api/users/stats" },
        {
          method: "post",
          path: "/api/users",
          data: { name: "Test", email: "test@example.com", password: "123456" },
        },
      ];

      for (const endpoint of endpoints) {
        const response =
          endpoint.method === "post"
            ? await request(app)
                [endpoint.method](endpoint.path)
                .send(endpoint.data)
            : await request(app)[endpoint.method](endpoint.path);

        // Verificar que la respuesta es JSON válido
        expect(response.type).toBe("application/json");
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body).toHaveProperty("success");
        expect(typeof response.body.success).toBe("boolean");
        expect(response.body).toHaveProperty("message");
        expect(typeof response.body.message).toBe("string");
      }
    });

    test("las respuestas de error deben incluir información útil", async () => {
      const response = await request(app)
        .post("/api/users")
        .send({ name: "", email: "invalid", password: "123" })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("errors");
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});
