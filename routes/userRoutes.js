const express = require("express");
const UserController = require("../controllers/userController");
const {
  validateUser,
  validateUserUpdate,
  validateId,
} = require("../middleware/validation");

const router = express.Router();

/**
 * Rutas para gestión de usuarios
 */

// Ruta para obtener estadísticas (debe ir antes que /:id para evitar conflictos)
router.get("/stats", UserController.getStats);

// Ruta para buscar por email (debe ir antes que /:id)
router.get("/search/email/:email", UserController.findByEmail);

// Rutas CRUD básicas
router.post("/", validateUser, UserController.create);
router.get("/", UserController.getAll);
router.get("/:id", validateId, UserController.getById);
router.put("/:id", validateId, validateUserUpdate, UserController.update);
router.patch(
  "/:id",
  validateId,
  validateUserUpdate,
  UserController.partialUpdate
);
router.delete("/:id", validateId, UserController.delete);

/**
 * Documentación de rutas:
 *
 * POST   /users              - Crear nuevo usuario
 * GET    /users              - Obtener todos los usuarios
 * GET    /users/stats        - Obtener estadísticas de usuarios
 * GET    /users/search/email/:email - Buscar usuario por email
 * GET    /users/:id          - Obtener usuario por ID
 * PUT    /users/:id          - Actualizar usuario completo
 * PATCH  /users/:id          - Actualizar usuario parcial
 * DELETE /users/:id          - Eliminar usuario
 *
 * Ejemplos de uso:
 *
 * Crear usuario:
 * POST /users
 * {
 *   "name": "Juan Pérez",
 *   "email": "juan@example.com",
 *   "password": "123456"
 * }
 *
 * Actualizar usuario:
 * PUT /users/123e4567-e89b-12d3-a456-426614174000
 * {
 *   "name": "Juan Carlos Pérez",
 *   "email": "juancarlos@example.com",
 *   "password": "newpassword"
 * }
 *
 * Actualización parcial:
 * PATCH /users/123e4567-e89b-12d3-a456-426614174000
 * {
 *   "name": "Juan Carlos"
 * }
 */

module.exports = router;
