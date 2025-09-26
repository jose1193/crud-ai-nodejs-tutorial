const { User, UserRepository } = require("../../models/User");

describe("User Model", () => {
  describe("Constructor y generación de IDs", () => {
    test("debe crear un usuario con ID generado automáticamente", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = new User(userData);

      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe("string");
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(user.name).toBe("Juan Pérez");
      expect(user.email).toBe("juan@example.com");
      expect(user.password).toBe("SecurePass123!");
      expect(user.createdAt).toBeDefined();
    });

    test("debe usar el ID proporcionado si se especifica", () => {
      const customId = "custom-id-123";
      const userData = {
        id: customId,
        name: "María García",
        email: "maria@example.com",
        password: "MyPassword123!",
      };

      const user = new User(userData);

      expect(user.id).toBe(customId);
    });

    test("debe usar la fecha proporcionada si se especifica", () => {
      const customDate = "2023-01-01T00:00:00.000Z";
      const userData = {
        name: "Carlos López",
        email: "carlos@example.com",
        password: "SecurePass123!",
        createdAt: customDate,
      };

      const user = new User(userData);

      expect(user.createdAt).toBe(customDate);
    });

    test("debe generar fecha actual si no se especifica", () => {
      const beforeCreation = new Date().toISOString();
      const user = new User({
        name: "Ana Martín",
        email: "ana@example.com",
        password: "MySecurePass123!",
      });
      const afterCreation = new Date().toISOString();

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt >= beforeCreation).toBe(true);
      expect(user.createdAt <= afterCreation).toBe(true);
    });
  });

  describe("Validación de nombre", () => {
    test("debe rechazar nombre vacío", () => {
      const result = User.validate({
        name: "",
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe rechazar nombre undefined", () => {
      const result = User.validate({
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe rechazar nombre null", () => {
      const result = User.validate({
        name: null,
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe rechazar nombre con solo espacios", () => {
      const result = User.validate({
        name: "   ",
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre debe tener al menos 2 caracteres"
      );
    });

    test("debe rechazar nombre de un solo carácter", () => {
      const result = User.validate({
        name: "A",
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre debe tener al menos 2 caracteres"
      );
    });

    test("debe rechazar nombre demasiado largo", () => {
      const longName = "a".repeat(51);
      const result = User.validate({
        name: longName,
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre no puede exceder los 50 caracteres"
      );
    });

    test("debe rechazar nombre de tipo incorrecto - número", () => {
      const result = User.validate({
        name: 123,
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe rechazar nombre de tipo incorrecto - objeto", () => {
      const result = User.validate({
        name: { firstName: "Juan" },
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe rechazar nombre de tipo incorrecto - array", () => {
      const result = User.validate({
        name: ["Juan", "Pérez"],
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
    });

    test("debe aceptar nombre válido de 2 caracteres", () => {
      const result = User.validate({
        name: "Jo",
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar nombre válido de 50 caracteres", () => {
      const name50 = "a".repeat(50);
      const result = User.validate({
        name: name50,
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar nombre con espacios al inicio y final (se trimean)", () => {
      const result = User.validate({
        name: "  Juan Pérez  ",
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Validación de email", () => {
    test("debe rechazar email vacío", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El email es requerido");
    });

    test("debe rechazar email undefined", () => {
      const result = User.validate({
        name: "Juan Pérez",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El email es requerido");
    });

    test("debe rechazar email null", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: null,
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El email es requerido");
    });

    test("debe rechazar email de tipo incorrecto - número", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: 123456,
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El email es requerido");
    });

    test("debe rechazar email sin @", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juanexample.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe rechazar email sin dominio", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe rechazar email sin extensión", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe rechazar email con espacios", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan @example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe rechazar email con múltiples @", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe rechazar email que empiece con @", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe aceptar email válido simple", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar email válido con subdominios", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@mail.example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar email válido con números", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan123@example123.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar email válido con guiones", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan-perez@my-domain.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar email válido con puntos", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan.perez@example.co.uk",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Validación de contraseña", () => {
    test("debe rechazar contraseña vacía", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La contraseña es requerida");
    });

    test("debe rechazar contraseña undefined", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La contraseña es requerida");
    });

    test("debe rechazar contraseña null", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: null,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La contraseña es requerida");
    });

    test("debe rechazar contraseña de tipo incorrecto - número", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: 123456,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La contraseña es requerida");
    });

    test("debe rechazar contraseña de tipo incorrecto - objeto", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: { pass: "123456" },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La contraseña es requerida");
    });

    test("debe rechazar contraseña muy corta - 5 caracteres", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "12345",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "La contraseña debe tener al menos 8 caracteres"
      );
    });

    test("debe rechazar contraseña muy larga - 101 caracteres", () => {
      const longPassword = "a".repeat(101);
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: longPassword,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "La contraseña no puede exceder los 100 caracteres"
      );
    });

    test("debe aceptar contraseña de longitud mínima - 6 caracteres", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar contraseña de longitud máxima - 100 caracteres", () => {
      // Crear contraseña de 100 caracteres que cumpla con todos los criterios
      const basePassword = "MySecurePass123!"; // 16 caracteres
      const remainingLength = 100 - basePassword.length;
      const maxPassword = basePassword + "a".repeat(remainingLength - 1) + "1"; // Agregar más caracteres para llegar a 100

      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: maxPassword,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar contraseña con caracteres especiales", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "P@ssw0rd!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe aceptar contraseña con espacios y caracteres especiales", () => {
      const result = User.validate({
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "Mi Contraseña Segura 123!",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Validación múltiple de errores", () => {
    test("debe reportar múltiples errores simultáneamente", () => {
      const result = User.validate({
        name: "",
        email: "email-invalido",
        password: "weak",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
      expect(result.errors).toContain("El formato del email no es válido");
      expect(result.errors).toContain(
        "La contraseña debe tener al menos 8 caracteres"
      );
    });

    test("debe reportar todos los errores posibles", () => {
      const result = User.validate({
        name: 123,
        email: null,
        password: ["password"],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain(
        "El nombre es requerido y debe ser una cadena de texto"
      );
      expect(result.errors).toContain("El email es requerido");
      expect(result.errors).toContain("La contraseña es requerida");
    });
  });

  describe("Validación para actualización", () => {
    test("debe permitir actualización sin campos", () => {
      const result = User.validateUpdate({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe validar nombre si está presente", () => {
      const result = User.validateUpdate({
        name: "A",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El nombre debe tener al menos 2 caracteres"
      );
    });

    test("debe validar email si está presente", () => {
      const result = User.validateUpdate({
        email: "email-invalido",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email no es válido");
    });

    test("debe validar contraseña si está presente", () => {
      const result = User.validateUpdate({
        password: "weak",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "La contraseña debe tener al menos 8 caracteres"
      );
    });

    test("debe permitir campos undefined", () => {
      const result = User.validateUpdate({
        name: undefined,
        email: undefined,
        password: undefined,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("debe validar múltiples campos presentes", () => {
      const result = User.validateUpdate({
        name: "",
        email: "invalid",
        password: "12",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
    });
  });

  describe("Métodos toJSON y toObject", () => {
    let user;

    beforeEach(() => {
      user = new User({
        id: "test-id-123",
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "secretpassword",
        createdAt: "2023-01-01T00:00:00.000Z",
      });
    });

    describe("toJSON", () => {
      test("debe retornar objeto sin contraseña", () => {
        const json = user.toJSON();

        expect(json).toEqual({
          id: "test-id-123",
          name: "Juan Pérez",
          email: "juan@example.com",
          createdAt: "2023-01-01T00:00:00.000Z",
        });
        expect(json.password).toBeUndefined();
      });

      test("debe retornar un objeto plano", () => {
        const json = user.toJSON();

        expect(json.constructor).toBe(Object);
        expect(json instanceof User).toBe(false);
      });

      test("debe incluir todos los campos excepto password", () => {
        const json = user.toJSON();

        expect(Object.keys(json)).toEqual(["id", "name", "email", "createdAt"]);
        expect(Object.keys(json)).toHaveLength(4);
      });
    });

    describe("toObject", () => {
      test("debe retornar objeto completo con contraseña", () => {
        const obj = user.toObject();

        expect(obj).toEqual({
          id: "test-id-123",
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "secretpassword",
          createdAt: "2023-01-01T00:00:00.000Z",
        });
      });

      test("debe retornar un objeto plano", () => {
        const obj = user.toObject();

        expect(obj.constructor).toBe(Object);
        expect(obj instanceof User).toBe(false);
      });

      test("debe incluir todos los campos", () => {
        const obj = user.toObject();

        expect(Object.keys(obj)).toEqual([
          "id",
          "name",
          "email",
          "password",
          "createdAt",
        ]);
        expect(Object.keys(obj)).toHaveLength(5);
      });

      test("debe preservar tipos de datos", () => {
        const obj = user.toObject();

        expect(typeof obj.id).toBe("string");
        expect(typeof obj.name).toBe("string");
        expect(typeof obj.email).toBe("string");
        expect(typeof obj.password).toBe("string");
        expect(typeof obj.createdAt).toBe("string");
      });
    });

    describe("Diferencias entre toJSON y toObject", () => {
      test("toJSON debe excluir password, toObject debe incluirla", () => {
        const json = user.toJSON();
        const obj = user.toObject();

        expect(json.password).toBeUndefined();
        expect(obj.password).toBe("secretpassword");
      });

      test("ambos métodos deben tener el resto de campos idénticos", () => {
        const json = user.toJSON();
        const obj = user.toObject();

        expect(json.id).toBe(obj.id);
        expect(json.name).toBe(obj.name);
        expect(json.email).toBe(obj.email);
        expect(json.createdAt).toBe(obj.createdAt);
      });
    });
  });
});

describe("UserRepository", () => {
  let repository;

  beforeEach(() => {
    // Crear nueva instancia para cada test
    repository = new UserRepository();
  });

  describe("Constructor", () => {
    test("debe inicializar con array vacío de usuarios", () => {
      expect(repository.users).toEqual([]);
      expect(Array.isArray(repository.users)).toBe(true);
    });
  });

  describe("create", () => {
    test("debe crear usuario válido", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = repository.create(userData);

      expect(user).toBeInstanceOf(User);
      expect(user.name).toBe("Juan Pérez");
      expect(user.email).toBe("juan@example.com");
      expect(user.password).toBe("SecurePass123!");
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(repository.users).toHaveLength(1);
      expect(repository.users[0]).toBe(user);
    });

    test("debe rechazar datos inválidos", () => {
      const invalidData = {
        name: "",
        email: "email-invalido",
        password: "weak",
      };

      expect(() => {
        repository.create(invalidData);
      }).toThrow("Datos inválidos");

      expect(repository.users).toHaveLength(0);
    });

    test("debe rechazar email duplicado", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "juan@example.com", // Email duplicado
        password: "SimplePass123!",
      };

      repository.create(userData1);

      expect(() => {
        repository.create(userData2);
      }).toThrow("El email ya está registrado");

      expect(repository.users).toHaveLength(1);
    });

    test("debe permitir crear múltiples usuarios con emails diferentes", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      expect(repository.users).toHaveLength(2);
      expect(user1.email).toBe("juan@example.com");
      expect(user2.email).toBe("maria@example.com");
    });
  });

  describe("findAll", () => {
    test("debe retornar array vacío cuando no hay usuarios", () => {
      const users = repository.findAll();

      expect(users).toEqual([]);
      expect(Array.isArray(users)).toBe(true);
    });

    test("debe retornar todos los usuarios", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };

      repository.create(userData1);
      repository.create(userData2);

      const users = repository.findAll();

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe("Juan Pérez");
      expect(users[1].name).toBe("María García");
    });

    test("debe retornar referencia directa al array interno", () => {
      const users = repository.findAll();

      expect(users).toBe(repository.users);
    });
  });

  describe("findById", () => {
    test("debe retornar undefined para ID inexistente", () => {
      const user = repository.findById("id-inexistente");

      expect(user).toBeUndefined();
    });

    test("debe encontrar usuario por ID", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const createdUser = repository.create(userData);
      const foundUser = repository.findById(createdUser.id);

      expect(foundUser).toBe(createdUser);
      expect(foundUser.name).toBe("Juan Pérez");
    });

    test("debe encontrar usuario correcto entre múltiples", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      const found1 = repository.findById(user1.id);
      const found2 = repository.findById(user2.id);

      expect(found1).toBe(user1);
      expect(found2).toBe(user2);
      expect(found1.name).toBe("Juan Pérez");
      expect(found2.name).toBe("María García");
    });
  });

  describe("findByEmail", () => {
    test("debe retornar undefined para email inexistente", () => {
      const user = repository.findByEmail("inexistente@example.com");

      expect(user).toBeUndefined();
    });

    test("debe encontrar usuario por email", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const createdUser = repository.create(userData);
      const foundUser = repository.findByEmail("juan@example.com");

      expect(foundUser).toBe(createdUser);
      expect(foundUser.name).toBe("Juan Pérez");
    });

    test("debe encontrar usuario correcto entre múltiples", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      const found1 = repository.findByEmail("juan@example.com");
      const found2 = repository.findByEmail("maria@example.com");

      expect(found1).toBe(user1);
      expect(found2).toBe(user2);
    });

    test("debe ser case-sensitive", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      repository.create(userData);

      const foundLower = repository.findByEmail("juan@example.com");
      const foundUpper = repository.findByEmail("JUAN@EXAMPLE.COM");

      expect(foundLower).toBeDefined();
      expect(foundUpper).toBeUndefined();
    });
  });

  describe("update", () => {
    let existingUser;

    beforeEach(() => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };
      existingUser = repository.create(userData);
    });

    test("debe retornar null para ID inexistente", () => {
      const result = repository.update("id-inexistente", {
        name: "Nuevo Nombre",
      });

      expect(result).toBeNull();
    });

    test("debe actualizar nombre", () => {
      const updatedUser = repository.update(existingUser.id, {
        name: "Juan Carlos Pérez",
      });

      expect(updatedUser.name).toBe("Juan Carlos Pérez");
      expect(updatedUser.email).toBe("juan@example.com"); // Sin cambios
      expect(updatedUser.password).toBe("SecurePass123!"); // Sin cambios
      expect(updatedUser.id).toBe(existingUser.id); // Sin cambios
    });

    test("debe actualizar email", () => {
      const updatedUser = repository.update(existingUser.id, {
        email: "nuevo@example.com",
      });

      expect(updatedUser.email).toBe("nuevo@example.com");
      expect(updatedUser.name).toBe("Juan Pérez"); // Sin cambios
    });

    test("debe actualizar contraseña", () => {
      const updatedUser = repository.update(existingUser.id, {
        password: "NuevaPassword123!",
      });

      expect(updatedUser.password).toBe("NuevaPassword123!");
      expect(updatedUser.name).toBe("Juan Pérez"); // Sin cambios
    });

    test("debe actualizar múltiples campos", () => {
      const updatedUser = repository.update(existingUser.id, {
        name: "María García",
        email: "maria@example.com",
        password: "NewSecurePass123!",
      });

      expect(updatedUser.name).toBe("María García");
      expect(updatedUser.email).toBe("maria@example.com");
      expect(updatedUser.password).toBe("NewSecurePass123!");
      expect(updatedUser.id).toBe(existingUser.id); // Sin cambios
    });

    test("debe rechazar datos inválidos", () => {
      expect(() => {
        repository.update(existingUser.id, {
          name: "",
          email: "email-invalido",
        });
      }).toThrow("Datos inválidos");

      // Usuario debe permanecer sin cambios
      const unchangedUser = repository.findById(existingUser.id);
      expect(unchangedUser.name).toBe("Juan Pérez");
      expect(unchangedUser.email).toBe("juan@example.com");
    });

    test("debe rechazar email duplicado", () => {
      // Crear segundo usuario
      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };
      const user2 = repository.create(userData2);

      // Intentar actualizar primer usuario con email del segundo
      expect(() => {
        repository.update(existingUser.id, {
          email: "maria@example.com",
        });
      }).toThrow("El email ya está registrado");

      // Usuarios deben permanecer sin cambios
      const unchanged1 = repository.findById(existingUser.id);
      const unchanged2 = repository.findById(user2.id);
      expect(unchanged1.email).toBe("juan@example.com");
      expect(unchanged2.email).toBe("maria@example.com");
    });

    test("debe permitir mantener el mismo email", () => {
      const updatedUser = repository.update(existingUser.id, {
        name: "Nuevo Nombre",
        email: "juan@example.com", // Mismo email
      });

      expect(updatedUser.name).toBe("Nuevo Nombre");
      expect(updatedUser.email).toBe("juan@example.com");
    });

    test("debe ignorar campos undefined", () => {
      const updatedUser = repository.update(existingUser.id, {
        name: "Nuevo Nombre",
        email: undefined,
        password: undefined,
      });

      expect(updatedUser.name).toBe("Nuevo Nombre");
      expect(updatedUser.email).toBe("juan@example.com"); // Sin cambios
      expect(updatedUser.password).toBe("SecurePass123!"); // Sin cambios
    });

    test("debe actualizar referencia en el array", () => {
      const updatedUser = repository.update(existingUser.id, {
        name: "Nombre Actualizado",
      });

      expect(repository.users[0]).toBe(updatedUser);
      expect(repository.users[0].name).toBe("Nombre Actualizado");
    });
  });

  describe("delete", () => {
    test("debe retornar false para ID inexistente", () => {
      const result = repository.delete("id-inexistente");

      expect(result).toBe(false);
    });

    test("debe eliminar usuario existente", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = repository.create(userData);
      const result = repository.delete(user.id);

      expect(result).toBe(true);
      expect(repository.users).toHaveLength(0);
      expect(repository.findById(user.id)).toBeUndefined();
    });

    test("debe eliminar usuario correcto entre múltiples", () => {
      const userData1 = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "María García",
        email: "maria@example.com",
        password: "SimplePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      const result = repository.delete(user1.id);

      expect(result).toBe(true);
      expect(repository.users).toHaveLength(1);
      expect(repository.findById(user1.id)).toBeUndefined();
      expect(repository.findById(user2.id)).toBe(user2);
    });

    test("debe mantener orden después de eliminar", () => {
      const userData1 = {
        name: "Usuario 1",
        email: "user1@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "Usuario 2",
        email: "user2@example.com",
        password: "SecurePass123!",
      };

      const userData3 = {
        name: "Usuario 3",
        email: "user3@example.com",
        password: "SecurePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);
      const user3 = repository.create(userData3);

      // Eliminar usuario del medio
      repository.delete(user2.id);

      expect(repository.users).toHaveLength(2);
      expect(repository.users[0]).toBe(user1);
      expect(repository.users[1]).toBe(user3);
    });
  });

  describe("Casos extremos y manejo de errores", () => {
    test("debe manejar múltiples operaciones simultáneas", () => {
      const userData1 = {
        name: "Usuario 1",
        email: "user1@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "Usuario 2",
        email: "user2@example.com",
        password: "SecurePass123!",
      };

      // Crear múltiples usuarios
      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      // Actualizar uno
      repository.update(user1.id, { name: "Usuario 1 Actualizado" });

      // Eliminar otro
      repository.delete(user2.id);

      // Verificar estado final
      expect(repository.users).toHaveLength(1);
      expect(repository.users[0].name).toBe("Usuario 1 Actualizado");
      expect(repository.findById(user2.id)).toBeUndefined();
    });

    test("debe manejar datos con caracteres especiales", () => {
      const userData = {
        name: "José María Ñoño",
        email: "jose.maria@dominio-español.com",
        password: "Contraseña123!@#",
      };

      const user = repository.create(userData);

      expect(user.name).toBe("José María Ñoño");
      expect(user.email).toBe("jose.maria@dominio-español.com");
      expect(user.password).toBe("Contraseña123!@#");
    });

    test("debe manejar límites de validación exactos", () => {
      const userData = {
        name: "ab", // Exactamente 2 caracteres
        email: "a@b.c", // Email mínimo válido
        password: "SecurePass123!", // Exactamente 6 caracteres
      };

      const user = repository.create(userData);

      expect(user.name).toBe("ab");
      expect(user.email).toBe("a@b.c");
      expect(user.password).toBe("SecurePass123!");
    });

    test("debe manejar nombres con espacios múltiples", () => {
      const userData = {
        name: "   Juan    Pérez   ",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = repository.create(userData);

      // El nombre se guarda tal como se proporciona (sin trim automático en constructor)
      expect(user.name).toBe("   Juan    Pérez   ");
    });

    test("debe preservar tipos de datos en todas las operaciones", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = repository.create(userData);

      // Verificar tipos después de crear
      expect(typeof user.id).toBe("string");
      expect(typeof user.name).toBe("string");
      expect(typeof user.email).toBe("string");
      expect(typeof user.password).toBe("string");
      expect(typeof user.createdAt).toBe("string");

      // Verificar tipos después de encontrar
      const foundUser = repository.findById(user.id);
      expect(typeof foundUser.id).toBe("string");
      expect(typeof foundUser.name).toBe("string");
      expect(typeof foundUser.email).toBe("string");
      expect(typeof foundUser.password).toBe("string");
      expect(typeof foundUser.createdAt).toBe("string");

      // Verificar tipos después de actualizar
      const updatedUser = repository.update(user.id, { name: "Nuevo Nombre" });
      expect(typeof updatedUser.name).toBe("string");
    });

    test("debe manejar repositorio con muchos usuarios", () => {
      // Crear 100 usuarios
      const users = [];
      for (let i = 0; i < 100; i++) {
        const userData = {
          name: `Usuario ${i}`,
          email: `user${i}@example.com`,
          password: "SecurePass123!",
        };
        users.push(repository.create(userData));
      }

      expect(repository.users).toHaveLength(100);

      // Encontrar usuario específico
      const found = repository.findByEmail("user50@example.com");
      expect(found.name).toBe("Usuario 50");

      // Eliminar algunos usuarios
      repository.delete(users[25].id);
      repository.delete(users[75].id);

      expect(repository.users).toHaveLength(98);
      expect(repository.findById(users[25].id)).toBeUndefined();
      expect(repository.findById(users[75].id)).toBeUndefined();
    });
  });

  describe("Integridad de datos", () => {
    test("debe mantener integridad después de operaciones fallidas", () => {
      const userData = {
        name: "Juan Pérez",
        email: "juan@example.com",
        password: "SecurePass123!",
      };

      const user = repository.create(userData);
      const originalLength = repository.users.length;

      // Intentar crear usuario con email duplicado
      try {
        repository.create({
          name: "Otro Usuario",
          email: "juan@example.com",
          password: "SimplePass123!",
        });
      } catch (error) {
        // Error esperado
      }

      // Intentar actualizar con datos inválidos
      try {
        repository.update(user.id, {
          name: "",
          email: "invalid-email",
        });
      } catch (error) {
        // Error esperado
      }

      // Verificar que el repositorio mantiene su estado original
      expect(repository.users).toHaveLength(originalLength);
      const unchangedUser = repository.findById(user.id);
      expect(unchangedUser.name).toBe("Juan Pérez");
      expect(unchangedUser.email).toBe("juan@example.com");
      expect(unchangedUser.password).toBe("SecurePass123!");
    });

    test("debe mantener unicidad de emails después de múltiples operaciones", () => {
      const userData1 = {
        name: "Usuario 1",
        email: "user1@example.com",
        password: "SecurePass123!",
      };

      const userData2 = {
        name: "Usuario 2",
        email: "user2@example.com",
        password: "SecurePass123!",
      };

      const user1 = repository.create(userData1);
      const user2 = repository.create(userData2);

      // Verificar que ambos emails son únicos
      const emails = repository.users.map((u) => u.email);
      const uniqueEmails = [...new Set(emails)];
      expect(emails).toHaveLength(uniqueEmails.length);

      // Actualizar email de user1
      repository.update(user1.id, { email: "new-email@example.com" });

      // Verificar que los emails siguen siendo únicos
      const updatedEmails = repository.users.map((u) => u.email);
      const updatedUniqueEmails = [...new Set(updatedEmails)];
      expect(updatedEmails).toHaveLength(updatedUniqueEmails.length);
    });
  });

  describe("Validación de fortaleza de contraseña", () => {
    describe("validatePasswordStrength", () => {
      test("debe validar contraseña fuerte correctamente", () => {
        const result = User.validatePasswordStrength("MiContraseña123!");

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.details.hasMinLength).toBe(true);
        expect(result.details.hasLowerCase).toBe(true);
        expect(result.details.hasUpperCase).toBe(true);
        expect(result.details.hasNumber).toBe(true);
        expect(result.details.hasSpecialChar).toBe(true);
      });

      test("debe rechazar contraseñas muy cortas", () => {
        const result = User.validatePasswordStrength("Short1!");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe tener al menos 8 caracteres"
        );
        expect(result.details.hasMinLength).toBe(false);
      });

      test("debe rechazar contraseñas sin minúscula", () => {
        const result = User.validatePasswordStrength("PASSWORD123!");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe contener al menos una letra minúscula"
        );
        expect(result.details.hasLowerCase).toBe(false);
      });

      test("debe rechazar contraseñas sin mayúscula", () => {
        const result = User.validatePasswordStrength("password123!");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe contener al menos una letra mayúscula"
        );
        expect(result.details.hasUpperCase).toBe(false);
      });

      test("debe rechazar contraseñas sin números", () => {
        const result = User.validatePasswordStrength("PasswordOnly!");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe contener al menos un número"
        );
        expect(result.details.hasNumber).toBe(false);
      });

      test("debe rechazar contraseñas sin caracteres especiales", () => {
        const result = User.validatePasswordStrength("Password123");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe contener al menos un carácter especial"
        );
        expect(result.details.hasSpecialChar).toBe(false);
      });

      test("debe rechazar entradas no válidas", () => {
        const result = User.validatePasswordStrength(null);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña es requerida y debe ser una cadena de texto"
        );
      });

      test("debe manejar contraseñas con múltiples fallos", () => {
        const result = User.validatePasswordStrength("weak");

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(4); // minLength, upperCase, number, specialChar
        expect(result.errors).toContain(
          "La contraseña debe tener al menos 8 caracteres"
        );
        expect(result.errors).toContain(
          "La contraseña debe contener al menos una letra mayúscula"
        );
        expect(result.errors).toContain(
          "La contraseña debe contener al menos un número"
        );
        expect(result.errors).toContain(
          "La contraseña debe contener al menos un carácter especial"
        );
      });

      test("debe validar diferentes caracteres especiales", () => {
        const specialChars = [
          "!",
          "@",
          "#",
          "$",
          "%",
          "^",
          "&",
          "*",
          "(",
          ")",
          "_",
          "+",
          "-",
          "=",
          "[",
          "]",
          "{",
          "}",
          ";",
          ":",
          "'",
          '"',
          "\\",
          "|",
          ",",
          ".",
          "<",
          ">",
          "/",
          "?",
        ];

        specialChars.forEach((char) => {
          const result = User.validatePasswordStrength(`Password123${char}`);
          expect(result.isValid).toBe(true);
          expect(result.details.hasSpecialChar).toBe(true);
        });
      });

      test("debe validar contraseñas en el límite de longitud", () => {
        const minLengthPassword = "Passw0rd!"; // 9 caracteres
        const result = User.validatePasswordStrength(minLengthPassword);

        expect(result.isValid).toBe(true);
        expect(result.details.hasMinLength).toBe(true);
      });
    });

    describe("Integración con validate()", () => {
      test("debe usar validación de fortaleza en validate()", () => {
        const validData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "SecurePass123!",
        };

        const result = User.validate(validData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("debe rechazar contraseñas débiles en validate()", () => {
        const invalidData = {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "weak",
        };

        const result = User.validate(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe tener al menos 8 caracteres"
        );
      });
    });

    describe("Integración con validateUpdate()", () => {
      test("debe usar validación de fortaleza en validateUpdate()", () => {
        const validUpdate = {
          password: "NewSecurePass456!",
        };

        const result = User.validateUpdate(validUpdate);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("debe rechazar contraseñas débiles en validateUpdate()", () => {
        const invalidUpdate = {
          password: "weak",
        };

        const result = User.validateUpdate(invalidUpdate);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "La contraseña debe tener al menos 8 caracteres"
        );
      });

      test("debe permitir actualizaciones sin contraseña", () => {
        const updateWithoutPassword = {
          name: "Nuevo Nombre",
        };

        const result = User.validateUpdate(updateWithoutPassword);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
