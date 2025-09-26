/**
 * Tests unitarios para el modelo User
 */

const { User, UserRepository } = require("../../models/User");

describe("User Model", () => {
  describe("Constructor", () => {
    test("debería crear un usuario con datos válidos", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const user = new User(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    test("debería generar ID único automáticamente", () => {
      const user1 = new User({
        name: "User 1",
        email: "user1@test.com",
        password: "123456",
      });
      const user2 = new User({
        name: "User 2",
        email: "user2@test.com",
        password: "123456",
      });

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.id).not.toBe(user2.id);
    });

    test("debería usar ID proporcionado si se especifica", () => {
      const customId = "custom-id-123";
      const user = new User({
        id: customId,
        name: "Test User",
        email: "test@example.com",
        password: "123456",
      });

      expect(user.id).toBe(customId);
    });
  });

  describe("Validación", () => {
    test("debería validar datos correctos", () => {
      const validData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const result = User.validate(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe("Validación de nombre", () => {
       test("debería rechazar nombre vacío", () => {
         const invalidData = {
           name: "",
           email: "test@example.com",
           password: "123456",
         };

         const result = User.validate(invalidData);

         expect(result.isValid).toBe(false);
         expect(result.errors).toContain(
           "El nombre es requerido y debe ser una cadena de texto"
         );
       });

      test("debería rechazar nombre muy corto", () => {
        const invalidData = {
          name: "A",
          email: "test@example.com",
          password: "123456",
        };

        const result = User.validate(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "El nombre debe tener al menos 2 caracteres"
        );
      });

      test("debería rechazar nombre muy largo", () => {
        const invalidData = {
          name: "A".repeat(51),
          email: "test@example.com",
          password: "123456",
        };

        const result = User.validate(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "El nombre no puede exceder los 50 caracteres"
        );
      });

      test("debería rechazar nombre no string", () => {
        const invalidData = {
          name: 123,
          email: "test@example.com",
          password: "123456",
        };

        const result = User.validate(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "El nombre es requerido y debe ser una cadena de texto"
        );
      });
    });

    describe("Validación de email", () => {
      test("debería rechazar email inválido", () => {
        const invalidEmails = [
          "invalid-email",
          "test@",
          "@example.com",
          "test.example.com",
          "test@example",
          "",
        ];

        invalidEmails.forEach((email) => {
          const result = User.validate({
            name: "Test User",
            email: email,
            password: "123456",
          });

          expect(result.isValid).toBe(false);
          expect(
            result.errors.some(
              (error) =>
                error.includes("formato del email") ||
                error.includes("email es requerido")
            )
          ).toBe(true);
        });
      });

      test("debería aceptar emails válidos", () => {
        const validEmails = [
          "test@example.com",
          "user.name@domain.co.uk",
          "test+tag@example.org",
          "user123@test-domain.com",
        ];

        validEmails.forEach((email) => {
          const result = User.validate({
            name: "Test User",
            email: email,
            password: "123456",
          });

          expect(result.isValid).toBe(true);
        });
      });
    });

    describe("Validación de contraseña", () => {
      test("debería rechazar contraseña muy corta", () => {
        const invalidData = {
          name: "Test User",
          email: "test@example.com",
          password: "12345",
        };

        const result = User.validate(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe tener al menos 6 caracteres"
        );
      });

      test("debería rechazar contraseña muy larga", () => {
        const invalidData = {
          name: "Test User",
          email: "test@example.com",
          password: "A".repeat(101),
        };

        const result = User.validate(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña no puede exceder los 100 caracteres"
        );
      });

      test("debería aceptar contraseña válida", () => {
        const validData = {
          name: "Test User",
          email: "test@example.com",
          password: "123456",
        };

        const result = User.validate(validData);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("Validación de actualización", () => {
    test("debería validar actualización con campos opcionales", () => {
      const updateData = {
        name: "Nuevo Nombre",
      };

      const result = User.validateUpdate(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debería validar actualización con todos los campos", () => {
      const updateData = {
        name: "Nuevo Nombre",
        email: "nuevo@example.com",
        password: "nueva123",
      };

      const result = User.validateUpdate(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debería rechazar campos inválidos en actualización", () => {
      const updateData = {
        name: "A",
        email: "invalid-email",
        password: "123",
      };

      const result = User.validateUpdate(updateData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Métodos de serialización", () => {
    test("toJSON debería excluir la contraseña", () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "secret123",
      });

      const json = user.toJSON();

      expect(json.id).toBeDefined();
      expect(json.name).toBe("Test User");
      expect(json.email).toBe("test@example.com");
      expect(json.createdAt).toBeDefined();
      expect(json.password).toBeUndefined();
    });

    test("toObject debería incluir la contraseña", () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "secret123",
      });

      const obj = user.toObject();

      expect(obj.id).toBeDefined();
      expect(obj.name).toBe("Test User");
      expect(obj.email).toBe("test@example.com");
      expect(obj.password).toBe("secret123");
      expect(obj.createdAt).toBeDefined();
    });
  });
});

describe("UserRepository", () => {
  let repository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe("Crear usuario", () => {
    test("debería crear un usuario válido", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      const user = repository.create(userData);

      expect(user).toBeInstanceOf(User);
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(repository.users).toHaveLength(1);
    });

    test("debería rechazar email duplicado", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "123456",
      };

      repository.create(userData);

      expect(() => {
        repository.create({
          name: "Otro Usuario",
          email: "juan@example.com",
          password: "654321",
        });
      }).toThrow("El email ya está registrado");
    });

    test("debería rechazar datos inválidos", () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        password: "123",
      };

      expect(() => {
        repository.create(invalidData);
      }).toThrow("Datos inválidos");
    });
  });

  describe("Buscar usuarios", () => {
    beforeEach(() => {
      repository.create({
        name: "Usuario 1",
        email: "user1@example.com",
        password: "123456",
      });
      repository.create({
        name: "Usuario 2",
        email: "user2@example.com",
        password: "123456",
      });
    });

    test("debería encontrar todos los usuarios", () => {
      const users = repository.findAll();

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe("Usuario 1");
      expect(users[1].name).toBe("Usuario 2");
    });

    test("debería encontrar usuario por ID", () => {
      const users = repository.findAll();
      const userId = users[0].id;

      const foundUser = repository.findById(userId);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(userId);
      expect(foundUser.name).toBe("Usuario 1");
    });

    test("debería retornar undefined para ID inexistente", () => {
      const foundUser = repository.findById("non-existent-id");

      expect(foundUser).toBeUndefined();
    });

    test("debería encontrar usuario por email", () => {
      const foundUser = repository.findByEmail("user1@example.com");

      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe("user1@example.com");
      expect(foundUser.name).toBe("Usuario 1");
    });

    test("debería retornar undefined para email inexistente", () => {
      const foundUser = repository.findByEmail("inexistente@example.com");

      expect(foundUser).toBeUndefined();
    });
  });

  describe("Actualizar usuario", () => {
    let userId;

    beforeEach(() => {
      const user = repository.create({
        name: "Usuario Original",
        email: "original@example.com",
        password: "123456",
      });
      userId = user.id;
    });

    test("debería actualizar usuario existente", () => {
      const updateData = {
        name: "Usuario Actualizado",
        email: "actualizado@example.com",
      };

      const updatedUser = repository.update(userId, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe("Usuario Actualizado");
      expect(updatedUser.email).toBe("actualizado@example.com");
    });

    test("debería actualizar solo campos proporcionados", () => {
      const originalUser = repository.findById(userId);
      const originalEmail = originalUser.email;

      const updateData = {
        name: "Solo Nombre Actualizado",
      };

      const updatedUser = repository.update(userId, updateData);

      expect(updatedUser.name).toBe("Solo Nombre Actualizado");
      expect(updatedUser.email).toBe(originalEmail);
    });

    test("debería retornar null para ID inexistente", () => {
      const result = repository.update("non-existent-id", { name: "Test" });

      expect(result).toBeNull();
    });

    test("debería rechazar email duplicado en actualización", () => {
      // Crear segundo usuario
      repository.create({
        name: "Usuario 2",
        email: "user2@example.com",
        password: "123456",
      });

      expect(() => {
        repository.update(userId, { email: "user2@example.com" });
      }).toThrow("El email ya está registrado");
    });

    test("debería permitir mantener el mismo email", () => {
      const updateData = {
        name: "Nombre Actualizado",
        email: "original@example.com", // Mismo email
      };

      const updatedUser = repository.update(userId, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe("Nombre Actualizado");
      expect(updatedUser.email).toBe("original@example.com");
    });
  });

  describe("Eliminar usuario", () => {
    let userId;

    beforeEach(() => {
      const user = repository.create({
        name: "Usuario a Eliminar",
        email: "eliminar@example.com",
        password: "123456",
      });
      userId = user.id;
    });

    test("debería eliminar usuario existente", () => {
      const result = repository.delete(userId);

      expect(result).toBe(true);
      expect(repository.users).toHaveLength(0);
      expect(repository.findById(userId)).toBeUndefined();
    });

    test("debería retornar false para ID inexistente", () => {
      const result = repository.delete("non-existent-id");

      expect(result).toBe(false);
      expect(repository.users).toHaveLength(1);
    });
  });
});
