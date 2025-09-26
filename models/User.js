const { v4: uuidv4 } = require("uuid");

/**
 * Clase que representa un usuario del sistema
 *
 * Esta clase encapsula toda la lógica y datos relacionados con un usuario,
 * incluyendo validación de datos, conversión de formatos y gestión de propiedades.
 * Utiliza UUID para identificadores únicos y maneja fechas en formato ISO.
 *
 * @class
 * @since 1.0.0
 * @author Sistema CRUD
 * @version 1.0.0
 *
 * @example
 * // Crear un nuevo usuario
 * const user = new User({
 *   name: "María González",
 *   email: "maria@example.com",
 *   password: "miContraseña123"
 * });
 *
 * // El ID y createdAt se generan automáticamente
 * console.log(user.id); // "123e4567-e89b-12d3-a456-426614174000"
 * console.log(user.createdAt); // "2025-09-25T10:30:00.000Z"
 */
class User {
  /**
   * Crear una nueva instancia de usuario
   *
   * @constructor
   * @param {Object} userData - Datos del usuario
   * @param {string} [userData.id] - ID único del usuario (UUID v4, se genera automáticamente si no se proporciona)
   * @param {string} userData.name - Nombre completo del usuario (2-50 caracteres)
   * @param {string} userData.email - Dirección de email válida del usuario
   * @param {string} userData.password - Contraseña del usuario (6-100 caracteres)
   * @param {string} [userData.createdAt] - Fecha de creación en formato ISO (se genera automáticamente si no se proporciona)
   *
   * @throws {Error} Cuando los datos proporcionados no cumplen con las validaciones básicas
   *
   * @example
   * // Usuario con ID generado automáticamente
   * const user1 = new User({
   *   name: "Juan Pérez",
   *   email: "juan@example.com",
   *   password: "password123"
   * });
   *
   * @example
   * // Usuario con ID específico (útil para migraciones)
   * const user2 = new User({
   *   id: "custom-uuid-123",
   *   name: "Ana López",
   *   email: "ana@example.com",
   *   password: "securePass456",
   *   createdAt: "2025-01-15T08:00:00.000Z"
   * });
   */
  constructor({ id = null, name, email, password, createdAt = null }) {
    this.id = id || uuidv4();
    this.name = name;
    this.email = email;
    this.password = password;
    this.createdAt = createdAt || new Date().toISOString();
  }

  /**
   * @property {string} id - Identificador único del usuario (UUID v4)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */

  /**
   * @property {string} name - Nombre completo del usuario
   * @example "María González"
   */

  /**
   * @property {string} email - Dirección de email del usuario (validada)
   * @example "maria.gonzalez@example.com"
   */

  /**
   * @property {string} password - Contraseña del usuario (hash o texto plano)
   * @example "miContraseña123"
   */

  /**
   * @property {string} createdAt - Fecha de creación en formato ISO 8601
   * @example "2025-09-25T10:30:00.000Z"
   */

  /**
   * Validar datos de usuario para creación (todos los campos requeridos)
   *
   * Esta función estática valida que todos los campos requeridos estén presentes
   * y cumplan con las reglas de negocio del sistema. Es utilizada antes de crear
   * nuevas instancias de usuario.
   *
   * @static
   * @param {Object} userData - Datos del usuario a validar
   * @param {string} userData.name - Nombre completo del usuario
   * @param {string} userData.email - Dirección de email del usuario
   * @param {string} userData.password - Contraseña del usuario
   *
   * @returns {Object} Resultado de la validación
   * @returns {boolean} return.isValid - true si todos los datos son válidos
   * @returns {string[]} return.errors - Array de mensajes de error (vacío si es válido)
   *
   * @example
   * // Datos válidos
   * const validResult = User.validate({
   *   name: "María González",
   *   email: "maria@example.com",
   *   password: "miContraseña123"
   * });
   * // validResult.isValid === true, validResult.errors === []
   *
   * @example
   * // Datos inválidos
   * const invalidResult = User.validate({
   *   name: "", // muy corto
   *   email: "invalid-email", // formato inválido
   *   password: "123" // muy corta
   * });
   * // invalidResult.isValid === false
   * // invalidResult.errors === ["El nombre debe tener al menos 2 caracteres", ...]
   */
  static validate(userData) {
    const errors = [];

    if (!userData.name || typeof userData.name !== "string") {
      errors.push("El nombre es requerido y debe ser una cadena de texto");
    } else if (userData.name.trim().length < 2) {
      errors.push("El nombre debe tener al menos 2 caracteres");
    } else if (userData.name.trim().length > 50) {
      errors.push("El nombre no puede exceder los 50 caracteres");
    }

    // Validar email
    if (!userData.email || typeof userData.email !== "string") {
      errors.push("El email es requerido");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push("El formato del email no es válido");
      }
    }

    // Validar password
    if (!userData.password || typeof userData.password !== "string") {
      errors.push("La contraseña es requerida");
    } else if (userData.password.length < 6) {
      errors.push("La contraseña debe tener al menos 6 caracteres");
    } else if (userData.password.length > 100) {
      errors.push("La contraseña no puede exceder los 100 caracteres");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validar datos de usuario para actualización (campos opcionales)
   *
   * Esta función estática valida solo los campos que están presentes en los datos
   * de actualización. Es más flexible que validate() ya que permite actualizaciones
   * parciales donde solo algunos campos necesitan ser modificados.
   *
   * @static
   * @param {Object} userData - Datos del usuario a validar para actualización
   * @param {string} [userData.name] - Nuevo nombre completo del usuario (opcional)
   * @param {string} [userData.email] - Nueva dirección de email del usuario (opcional)
   * @param {string} [userData.password] - Nueva contraseña del usuario (opcional)
   *
   * @returns {Object} Resultado de la validación
   * @returns {boolean} return.isValid - true si los datos proporcionados son válidos
   * @returns {string[]} return.errors - Array de mensajes de error (vacío si es válido)
   *
   * @example
   * // Actualización válida (solo email)
   * const validResult = User.validateUpdate({
   *   email: "nuevo.email@example.com"
   * });
   * // validResult.isValid === true, validResult.errors === []
   *
   * @example
   * // Actualización inválida
   * const invalidResult = User.validateUpdate({
   *   name: "A", // muy corto
   *   email: "not-an-email", // formato inválido
   *   password: "" // vacío
   * });
   * // invalidResult.isValid === false
   * // invalidResult.errors contiene los mensajes de error
   *
   * @example
   * // Sin campos para actualizar (válido)
   * const emptyResult = User.validateUpdate({});
   * // emptyResult.isValid === true, emptyResult.errors === []
   */
  static validateUpdate(userData) {
    const errors = [];

    // Validar nombre si está presente
    if (userData.name !== undefined) {
      if (typeof userData.name !== "string") {
        errors.push("El nombre debe ser una cadena de texto");
      } else if (userData.name.trim().length < 2) {
        errors.push("El nombre debe tener al menos 2 caracteres");
      } else if (userData.name.trim().length > 50) {
        errors.push("El nombre no puede exceder los 50 caracteres");
      }
    }

    // Validar email si está presente
    if (userData.email !== undefined) {
      if (typeof userData.email !== "string") {
        errors.push("El email debe ser una cadena de texto");
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          errors.push("El formato del email no es válido");
        }
      }
    }

    // Validar password si está presente
    if (userData.password !== undefined) {
      if (typeof userData.password !== "string") {
        errors.push("La contraseña debe ser una cadena de texto");
      } else if (userData.password.length < 6) {
        errors.push("La contraseña debe tener al menos 6 caracteres");
      } else if (userData.password.length > 100) {
        errors.push("La contraseña no puede exceder los 100 caracteres");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convertir la instancia a objeto plano seguro para respuestas JSON
   *
   * Este método retorna un objeto plano con todos los datos públicos del usuario,
   * excluyendo información sensible como la contraseña. Es ideal para respuestas
   * HTTP y serialización JSON segura.
   *
   * @returns {Object} Objeto plano con datos públicos del usuario
   * @returns {string} return.id - ID único del usuario
   * @returns {string} return.name - Nombre completo del usuario
   * @returns {string} return.email - Dirección de email del usuario
   * @returns {string} return.createdAt - Fecha de creación en formato ISO
   *
   * @example
   * const user = new User({
   *   name: "María González",
   *   email: "maria@example.com",
   *   password: "secret123"
   * });
   *
   * const publicData = user.toJSON();
   * // {
   * //   id: "123e4567-e89b-12d3-a456-426614174000",
   * //   name: "María González",
   * //   email: "maria@example.com",
   * //   createdAt: "2025-09-25T10:30:00.000Z"
   * // }
   *
   * // Nota: password NO está incluido por seguridad
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      // Nota: No incluimos password por seguridad
    };
  }

  /**
   * Convertir la instancia a objeto plano completo (solo uso interno)
   *
   * Este método retorna un objeto plano con TODOS los datos del usuario,
   * incluyendo información sensible como la contraseña. Debe usarse solo
   * internamente y nunca en respuestas HTTP públicas.
   *
   * @private
   * @returns {Object} Objeto plano con todos los datos del usuario
   * @returns {string} return.id - ID único del usuario
   * @returns {string} return.name - Nombre completo del usuario
   * @returns {string} return.email - Dirección de email del usuario
   * @returns {string} return.password - Contraseña del usuario (¡USO INTERNO SOLAMENTE!)
   * @returns {string} return.createdAt - Fecha de creación en formato ISO
   *
   * @example
   * const user = new User({
   *   name: "María González",
   *   email: "maria@example.com",
   *   password: "secret123"
   * });
   *
   * const allData = user.toObject();
   * // {
   * //   id: "123e4567-e89b-12d3-a456-426614174000",
   * //   name: "María González",
   * //   email: "maria@example.com",
   * //   password: "secret123",  // ← ¡PELIGROSO!
   * //   createdAt: "2025-09-25T10:30:00.000Z"
   * // }
   *
   * @warning No usar en respuestas HTTP públicas - expone información sensible
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      password: this.password,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Repositorio para gestión de usuarios en memoria
 *
 * Esta clase implementa el patrón Repository para gestionar operaciones CRUD
 * de usuarios. Simula una base de datos en memoria usando un array, proporcionando
 * métodos para crear, leer, actualizar y eliminar usuarios con validaciones
 * de negocio y manejo de errores.
 *
 * Implementa el patrón Singleton a través de la instancia exportada userRepository.
 *
 * @class
 * @since 1.0.0
 * @author Sistema CRUD
 * @version 1.0.0
 *
 * @example
 * // Usar la instancia singleton (recomendado)
 * const { userRepository } = require('./models/User');
 *
 * // Crear usuario
 * const user = userRepository.create({
 *   name: "María González",
 *   email: "maria@example.com",
 *   password: "password123"
 * });
 *
 * @example
 * // Crear nueva instancia (no recomendado, rompe el patrón singleton)
 * const customRepo = new UserRepository();
 */
class UserRepository {
  /**
   * Crear una nueva instancia del repositorio de usuarios
   *
   * Inicializa un array vacío para almacenar los usuarios en memoria.
   * En un entorno de producción, esto se conectaría a una base de datos real.
   *
   * @constructor
   *
   * @example
   * const repo = new UserRepository();
   * // repo.users === []
   */
  constructor() {
    this.users = [];
  }

  /**
   * Crear un nuevo usuario en el repositorio
   *
   * Este método valida los datos del usuario, verifica que el email no esté
   * registrado previamente, crea una nueva instancia de User y la almacena
   * en el repositorio en memoria.
   *
   * @param {Object} userData - Datos del usuario a crear
   * @param {string} userData.name - Nombre completo del usuario
   * @param {string} userData.email - Dirección de email única del usuario
   * @param {string} userData.password - Contraseña del usuario
   *
   * @returns {User} Instancia del usuario creado
   *
   * @throws {Error} Cuando los datos de validación fallan
   * @throws {Error} Cuando el email ya está registrado en el sistema
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * try {
   *   const newUser = userRepository.create({
   *     name: "Juan Pérez",
   *     email: "juan@example.com",
   *     password: "securePassword123"
   *   });
   *
   *   console.log(newUser.id); // UUID generado
   *   console.log(newUser.name); // "Juan Pérez"
   *   console.log(newUser.email); // "juan@example.com"
   * } catch (error) {
   *   console.error("Error creando usuario:", error.message);
   * }
   *
   * @example
   * // Error: email duplicado
   * try {
   *   userRepository.create({
   *     name: "Ana López",
   *     email: "juan@example.com", // Ya existe
   *     password: "password456"
   *   });
   * } catch (error) {
   *   console.error(error.message); // "El email ya está registrado"
   * }
   */
  create(userData) {
    const validation = User.validate(userData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(", ")}`);
    }

    // Verificar si el email ya existe
    if (this.findByEmail(userData.email)) {
      throw new Error("El email ya está registrado");
    }

    const user = new User(userData);
    this.users.push(user);
    return user;
  }

  /**
   * Obtener todos los usuarios del repositorio
   *
   * Este método retorna una copia del array completo de usuarios almacenados
   * en memoria. Los objetos retornados son las instancias originales de User,
   * por lo que cualquier modificación afectaría los datos almacenados.
   *
   * @returns {User[]} Array con todas las instancias de usuario almacenadas
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * // Obtener todos los usuarios
   * const allUsers = userRepository.findAll();
   *
   * console.log(`Total de usuarios: ${allUsers.length}`);
   * allUsers.forEach(user => {
   *   console.log(`${user.name} - ${user.email}`);
   * });
   *
   * @example
   * // Sistema vacío
   * const emptyUsers = userRepository.findAll();
   * console.log(emptyUsers); // []
   */
  findAll() {
    return this.users;
  }

  /**
   * Buscar un usuario específico por su ID único
   *
   * Este método busca en el repositorio un usuario que coincida con el ID
   * proporcionado. Si no se encuentra ningún usuario con ese ID, retorna undefined.
   *
   * @param {string} id - ID único del usuario a buscar (formato UUID)
   *
   * @returns {User|undefined} Instancia del usuario encontrado o undefined si no existe
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * // Buscar usuario existente
   * const user = userRepository.findById("123e4567-e89b-12d3-a456-426614174000");
   * if (user) {
   *   console.log(`Usuario encontrado: ${user.name}`);
   * } else {
   *   console.log("Usuario no encontrado");
   * }
   *
   * @example
   * // Buscar usuario inexistente
   * const notFound = userRepository.findById("non-existent-id");
   * console.log(notFound); // undefined
   */
  findById(id) {
    return this.users.find((user) => user.id === id);
  }

  /**
   * Buscar un usuario específico por su dirección de email
   *
   * Este método busca en el repositorio un usuario que coincida con el email
   * proporcionado. Útil para validaciones de registro, autenticación y
   * recuperación de cuentas. Si no se encuentra ningún usuario, retorna undefined.
   *
   * @param {string} email - Dirección de email del usuario a buscar
   *
   * @returns {User|undefined} Instancia del usuario encontrado o undefined si no existe
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * // Buscar usuario por email
   * const user = userRepository.findByEmail("maria@example.com");
   * if (user) {
   *   console.log(`Usuario encontrado: ${user.name}`);
   *   console.log(`ID: ${user.id}`);
   * } else {
   *   console.log("No se encontró usuario con ese email");
   * }
   *
   * @example
   * // Verificar disponibilidad de email
   * const existingUser = userRepository.findByEmail("nuevo@email.com");
   * if (existingUser) {
   *   console.log("Email ya registrado");
   * } else {
   *   console.log("Email disponible para registro");
   * }
   */
  findByEmail(email) {
    return this.users.find((user) => user.email === email);
  }

  /**
   * Actualizar un usuario existente con nuevos datos
   *
   * Este método busca un usuario por ID, valida los datos de actualización,
   * verifica que el nuevo email (si se proporciona) no esté en uso por otro usuario,
   * y actualiza solo los campos especificados en updateData.
   *
   * @param {string} id - ID único del usuario a actualizar (formato UUID)
   * @param {Object} updateData - Datos a actualizar (campos opcionales)
   * @param {string} [updateData.name] - Nuevo nombre del usuario
   * @param {string} [updateData.email] - Nueva dirección de email (debe ser única)
   * @param {string} [updateData.password] - Nueva contraseña del usuario
   *
   * @returns {User|null} Instancia del usuario actualizado o null si no se encontró
   *
   * @throws {Error} Cuando los datos de actualización son inválidos
   * @throws {Error} Cuando el nuevo email ya está registrado por otro usuario
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * // Actualizar nombre y email
   * try {
   *   const updatedUser = userRepository.update("user-id-123", {
   *     name: "María José González",
   *     email: "maria.jose@example.com"
   *   });
   *
   *   if (updatedUser) {
   *     console.log("Usuario actualizado:", updatedUser.name);
   *   } else {
   *     console.log("Usuario no encontrado");
   *   }
   * } catch (error) {
   *   console.error("Error actualizando:", error.message);
   * }
   *
   * @example
   * // Solo actualizar contraseña
   * const userWithNewPassword = userRepository.update("user-id-123", {
   *   password: "nuevaContraseñaSegura123"
   * });
   *
   * @example
   * // Error: email duplicado
   * try {
   *   userRepository.update("user-id-123", {
   *     email: "existing@email.com" // Ya usado por otro usuario
   *   });
   * } catch (error) {
   *   console.error(error.message); // "El email ya está registrado"
   * }
   */
  update(id, updateData) {
    const validation = User.validateUpdate(updateData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(", ")}`);
    }

    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    // Verificar si el email ya existe (excepto el usuario actual)
    if (updateData.email) {
      const existingUser = this.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error("El email ya está registrado");
      }
    }

    // Actualizar solo los campos proporcionados
    const user = this.users[userIndex];
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    });

    return user;
  }

  /**
   * Eliminar un usuario del repositorio
   *
   * Este método busca un usuario por ID y lo elimina permanentemente del
   * repositorio en memoria. La eliminación es irreversible.
   *
   * @param {string} id - ID único del usuario a eliminar (formato UUID)
   *
   * @returns {boolean} true si el usuario fue eliminado, false si no se encontró
   *
   * @example
   * const { userRepository } = require('./models/User');
   *
   * // Eliminar usuario existente
   * const deleted = userRepository.delete("user-id-123");
   * if (deleted) {
   *   console.log("Usuario eliminado exitosamente");
   * } else {
   *   console.log("Usuario no encontrado");
   * }
   *
   * @example
   * // Intentar eliminar usuario inexistente
   * const notDeleted = userRepository.delete("non-existent-id");
   * console.log(notDeleted); // false
   */
  delete(id) {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return false;
    }

    this.users.splice(userIndex, 1);
    return true;
  }
}

// Instancia única del repositorio (singleton)
const userRepository = new UserRepository();

module.exports = {
  User,
  UserRepository,
  userRepository,
};
