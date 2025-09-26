const { userRepository } = require("../models/User");
const { getEmailService } = require("../services/emailService");

class UserController {
  /**
   * Crear un nuevo usuario en el sistema
   *
   * Esta función crea un nuevo usuario validando los datos de entrada,
   * verificando que el email no esté registrado previamente y enviando
   * automáticamente un email de bienvenida si la configuración de email
   * está disponible.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.name - Nombre completo del usuario (2-50 caracteres)
   * @param {string} req.body.email - Dirección de email válida y única
   * @param {string} req.body.password - Contraseña del usuario (6-100 caracteres)
   * @param {string} req.ip - Dirección IP del cliente que realiza la solicitud
   * @param {Function} req.get - Función para obtener headers HTTP
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP
   *
   * @throws {Error} Cuando los datos de entrada son inválidos
   * @throws {Error} Cuando el email ya está registrado en el sistema
   *
   * @example
   * // Ejemplo de solicitud POST /users
   * {
   *   "name": "María González",
   *   "email": "maria.gonzalez@example.com",
   *   "password": "miContraseña123"
   * }
   *
   * // Respuesta exitosa (201)
   * {
   *   "success": true,
   *   "message": "Usuario creado exitosamente",
   *   "data": {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "name": "María González",
   *     "email": "maria.gonzalez@example.com",
   *     "createdAt": "2025-09-25T10:30:00.000Z"
   *   }
   * }
   *
   * @example
   * // Ejemplo con error de validación (400)
   * {
   *   "success": false,
   *   "message": "Error al crear usuario",
   *   "error": "Datos inválidos: El nombre debe tener al menos 2 caracteres, El formato del email no es válido"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async create(req, res) {
    try {
      const { name, email, password } = req.body;

      const user = userRepository.create({ name, email, password });

      try {
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const emailService = await getEmailService();
          await emailService.sendAdvancedWelcomeEmail(email, {
            name,
            email,
            id: user.id,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            features: ["advanced-analytics", "premium-support"],
          });
        } else {
          console.log("ℹ Email no configurado - saltando envío de bienvenida");
        }
      } catch (emailError) {
        console.warn(
          "Error al enviar email de bienvenida:",
          emailError.message
        );
        // No fallar la creación del usuario por un error de email
      }

      res.status(201).json({
        success: true,
        message: "Usuario creado exitosamente",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error al crear usuario",
        error: error.message,
      });
    }
  }

  /**
   * Obtener todos los usuarios registrados en el sistema
   *
   * Esta función recupera la lista completa de usuarios almacenados en la base de datos,
   * retornando sus datos públicos (excluyendo contraseñas por seguridad) junto con
   * el conteo total de usuarios encontrados.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con array de usuarios
   *
   * @example
   * // Solicitud GET /users
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuarios obtenidos exitosamente",
   *   "data": [
   *     {
   *       "id": "123e4567-e89b-12d3-a456-426614174000",
   *       "name": "María González",
   *       "email": "maria.gonzalez@example.com",
   *       "createdAt": "2025-09-25T10:30:00.000Z"
   *     },
   *     {
   *       "id": "456e7890-e89b-12d3-a456-426614174001",
   *       "name": "Juan Pérez",
   *       "email": "juan.perez@example.com",
   *       "createdAt": "2025-09-25T11:15:00.000Z"
   *     }
   *   ],
   *   "count": 2
   * }
   *
   * @example
   * // Respuesta cuando no hay usuarios (200)
   * {
   *   "success": true,
   *   "message": "Usuarios obtenidos exitosamente",
   *   "data": [],
   *   "count": 0
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getAll(req, res) {
    try {
      const users = userRepository.findAll();

      res.status(200).json({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: users.map((user) => user.toJSON()),
        count: users.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener usuarios",
        error: error.message,
      });
    }
  }

  /**
   * Obtener un usuario específico por su ID único
   *
   * Esta función busca y retorna los datos públicos de un usuario específico
   * identificado por su UUID. Si el usuario no existe, retorna un error 404.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.params - Parámetros de ruta
   * @param {string} req.params.id - ID único del usuario (formato UUID)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con datos del usuario
   *
   * @throws {Error} Cuando el usuario no es encontrado (maneja como respuesta 404)
   *
   * @example
   * // Solicitud GET /users/123e4567-e89b-12d3-a456-426614174000
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuario obtenido exitosamente",
   *   "data": {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "name": "María González",
   *     "email": "maria.gonzalez@example.com",
   *     "createdAt": "2025-09-25T10:30:00.000Z"
   *   }
   * }
   *
   * @example
   * // Respuesta cuando el usuario no existe (404)
   * {
   *   "success": false,
   *   "message": "Usuario no encontrado"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const user = userRepository.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario obtenido exitosamente",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener usuario",
        error: error.message,
      });
    }
  }

  /**
   * Actualizar completamente un usuario existente
   *
   * Esta función reemplaza completamente los datos de un usuario existente con
   * la información proporcionada. Los campos id y createdAt no pueden ser
   * modificados. Si el email es actualizado, se verifica que no esté en uso
   * por otro usuario.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.params - Parámetros de ruta
   * @param {string} req.params.id - ID único del usuario a actualizar (formato UUID)
   * @param {Object} req.body - Cuerpo de la solicitud con datos actualizados
   * @param {string} [req.body.name] - Nuevo nombre completo del usuario (2-50 caracteres)
   * @param {string} [req.body.email] - Nueva dirección de email válida y única
   * @param {string} [req.body.password] - Nueva contraseña del usuario (6-100 caracteres)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con usuario actualizado
   *
   * @throws {Error} Cuando los datos de entrada son inválidos
   * @throws {Error} Cuando el usuario no existe (maneja como respuesta 404)
   * @throws {Error} Cuando el email ya está registrado por otro usuario
   *
   * @example
   * // Solicitud PUT /users/123e4567-e89b-12d3-a456-426614174000
   * {
   *   "name": "María José González",
   *   "email": "maria.jose@example.com",
   *   "password": "nuevaContraseña123"
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuario actualizado exitosamente",
   *   "data": {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "name": "María José González",
   *     "email": "maria.jose@example.com",
   *     "createdAt": "2025-09-25T10:30:00.000Z"
   *   }
   * }
   *
   * @example
   * // Actualización parcial (solo algunos campos)
   * {
   *   "name": "María González"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remover campos que no se deben actualizar
      delete updateData.id;
      delete updateData.createdAt;

      const user = userRepository.update(id, updateData);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error al actualizar usuario",
        error: error.message,
      });
    }
  }

  /**
   * Actualizar parcialmente un usuario existente
   *
   * Esta función actualiza solo los campos proporcionados en la solicitud,
   * dejando intactos los campos no especificados. Es útil para actualizaciones
   * selectivas donde no se requiere reemplazar todos los datos del usuario.
   * Los campos id y createdAt no pueden ser modificados.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.params - Parámetros de ruta
   * @param {string} req.params.id - ID único del usuario a actualizar (formato UUID)
   * @param {Object} req.body - Cuerpo de la solicitud con campos a actualizar
   * @param {string} [req.body.name] - Nuevo nombre completo del usuario (2-50 caracteres)
   * @param {string} [req.body.email] - Nueva dirección de email válida y única
   * @param {string} [req.body.password] - Nueva contraseña del usuario (6-100 caracteres)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con usuario actualizado
   *
   * @throws {Error} Cuando los datos de entrada son inválidos
   * @throws {Error} Cuando el usuario no existe (maneja como respuesta 404)
   * @throws {Error} Cuando el email ya está registrado por otro usuario
   *
   * @example
   * // Solicitud PATCH /users/123e4567-e89b-12d3-a456-426614174000
   * {
   *   "name": "María José González"
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuario actualizado exitosamente",
   *   "data": {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "name": "María José González",
   *     "email": "maria.gonzalez@example.com",
   *     "createdAt": "2025-09-25T10:30:00.000Z"
   *   }
   * }
   *
   * @example
   * // Actualización de múltiples campos
   * {
   *   "name": "María González",
   *   "password": "nuevaContraseña123"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async partialUpdate(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remover campos que no se deben actualizar
      delete updateData.id;
      delete updateData.createdAt;

      const user = userRepository.update(id, updateData);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Error al actualizar usuario",
        error: error.message,
      });
    }
  }

  /**
   * Eliminar permanentemente un usuario del sistema
   *
   * Esta función elimina completamente un usuario identificado por su ID único.
   * La eliminación es permanente e irreversible. Si el usuario no existe,
   * se retorna un error 404.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.params - Parámetros de ruta
   * @param {string} req.params.id - ID único del usuario a eliminar (formato UUID)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con confirmación
   *
   * @throws {Error} Cuando el usuario no existe (maneja como respuesta 404)
   *
   * @example
   * // Solicitud DELETE /users/123e4567-e89b-12d3-a456-426614174000
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuario eliminado exitosamente"
   * }
   *
   * @example
   * // Respuesta cuando el usuario no existe (404)
   * {
   *   "success": false,
   *   "message": "Usuario no encontrado"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deleted = userRepository.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario eliminado exitosamente",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al eliminar usuario",
        error: error.message,
      });
    }
  }

  /**
   * Buscar un usuario específico por su dirección de email
   *
   * Esta función permite encontrar un usuario registrado mediante su dirección
   * de email. Útil para validaciones de registro, recuperación de cuentas
   * y verificaciones de existencia de usuarios.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.params - Parámetros de ruta
   * @param {string} req.params.email - Dirección de email a buscar (debe ser válida)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con datos del usuario
   *
   * @throws {Error} Cuando el usuario no es encontrado (maneja como respuesta 404)
   *
   * @example
   * // Solicitud GET /users/search/email/maria.gonzalez@example.com
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Usuario encontrado exitosamente",
   *   "data": {
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "name": "María González",
   *     "email": "maria.gonzalez@example.com",
   *     "createdAt": "2025-09-25T10:30:00.000Z"
   *   }
   * }
   *
   * @example
   * // Respuesta cuando el email no existe (404)
   * {
   *   "success": false,
   *   "message": "Usuario no encontrado con ese email"
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async findByEmail(req, res) {
    try {
      const { email } = req.params;

      const user = userRepository.findByEmail(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado con ese email",
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario encontrado exitosamente",
        data: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al buscar usuario",
        error: error.message,
      });
    }
  }

  /**
   * Obtener estadísticas generales del sistema de usuarios
   *
   * Esta función proporciona métricas importantes sobre el estado actual
   * de los usuarios en el sistema, incluyendo conteos totales y estadísticas
   * temporales como usuarios creados hoy y esta semana.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con estadísticas
   *
   * @example
   * // Solicitud GET /users/stats
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Estadísticas obtenidas exitosamente",
   *   "data": {
   *     "totalUsers": 25,
   *     "usersCreatedToday": 3,
   *     "usersCreatedThisWeek": 8
   *   }
   * }
   *
   * @example
   * // Sistema sin usuarios
   * {
   *   "success": true,
   *   "message": "Estadísticas obtenidas exitosamente",
   *   "data": {
   *     "totalUsers": 0,
   *     "usersCreatedToday": 0,
   *     "usersCreatedThisWeek": 0
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getStats(req, res) {
    try {
      const users = userRepository.findAll();

      const stats = {
        totalUsers: users.length,
        usersCreatedToday: users.filter((user) => {
          const today = new Date().toDateString();
          const userDate = new Date(user.createdAt).toDateString();
          return today === userDate;
        }).length,
        usersCreatedThisWeek: users.filter((user) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(user.createdAt) >= weekAgo;
        }).length,
      };

      res.status(200).json({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener estadísticas",
        error: error.message,
      });
    }
  }
}

module.exports = UserController;
