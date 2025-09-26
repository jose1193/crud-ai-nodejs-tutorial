const express = require("express");
const EmailController = require("../controllers/emailController");
const { validateJSON, sanitizeInput } = require("../middleware/validation");

const router = express.Router();

/**
 * Rutas para gestión de emails
 */

// Middleware específico para rutas de email
router.use(validateJSON);
router.use(sanitizeInput);

// Rutas de estadísticas y configuración
router.get("/stats", EmailController.getEmailStats);
router.get("/config", EmailController.getEmailConfig);
router.get("/templates", EmailController.getAvailableTemplates);

// Rutas de envío de emails predefinidos
router.post("/welcome", EmailController.sendWelcomeEmail);
router.post("/password-reset", EmailController.sendPasswordResetEmail);
router.post("/verification", EmailController.sendVerificationEmail);
router.post("/notification", EmailController.sendNotificationEmail);

// Rutas de utilidad
router.post("/custom", EmailController.sendCustomEmail);
router.post("/test", EmailController.testEmail);

/**
 * Documentación de rutas de email:
 *
 * GET    /emails/stats              - Obtener estadísticas del servicio
 * GET    /emails/config             - Obtener configuración actual
 * GET    /emails/templates          - Obtener templates disponibles
 * POST   /emails/welcome            - Enviar email de bienvenida
 * POST   /emails/password-reset     - Enviar email de recuperación
 * POST   /emails/verification       - Enviar email de verificación
 * POST   /emails/notification       - Enviar notificación por email
 * POST   /emails/custom             - Enviar email personalizado
 * POST   /emails/test               - Enviar email de prueba
 *
 * Ejemplos de uso:
 *
 * Enviar email de bienvenida:
 * POST /emails/welcome
 * {
 *   "userEmail": "usuario@example.com",
 *   "userData": {
 *     "name": "Juan Pérez",
 *     "email": "usuario@example.com",
 *     "id": "123e4567-e89b-12d3-a456-426614174000",
 *     "ip": "192.168.1.1",
 *     "userAgent": "Mozilla/5.0..."
 *   }
 * }
 *
 * Enviar notificación:
 * POST /emails/notification
 * {
 *   "userEmail": "usuario@example.com",
 *   "notificationData": {
 *     "userName": "Juan Pérez",
 *     "title": "Actualización importante",
 *     "message": "Tu perfil ha sido actualizado exitosamente.",
 *     "type": "success",
 *     "isSuccess": true,
 *     "successTitle": "Perfil actualizado",
 *     "successMessage": "Todos los cambios se guardaron correctamente."
 *   }
 * }
 *
 * Enviar email personalizado:
 * POST /emails/custom
 * {
 *   "to": "usuario@example.com",
 *   "subject": "Asunto personalizado",
 *   "template": "notification",
 *   "data": {
 *     "userName": "Juan",
 *     "notificationTitle": "Título personalizado",
 *     "notificationMessage": "Mensaje personalizado"
 *   }
 * }
 *
 * Probar configuración:
 * POST /emails/test
 * {
 *   "to": "test@example.com"
 * }
 */

module.exports = router;
