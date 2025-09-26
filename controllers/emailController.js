const { getEmailService } = require("../services/emailService");
const { emailConfig } = require("../config/emailConfig");

class EmailController {
  /**
   * Enviar email de bienvenida a un nuevo usuario
   *
   * Esta función envía un email personalizado de bienvenida cuando un usuario
   * se registra en el sistema. El email incluye información del usuario,
   * fecha de registro, IP y datos del dispositivo utilizado.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.userEmail - Dirección de email del destinatario
   * @param {Object} req.body.userData - Datos del usuario para personalizar el email
   * @param {string} req.body.userData.name - Nombre completo del usuario
   * @param {string} req.body.userData.email - Email del usuario
   * @param {string} req.body.userData.id - ID único del usuario (UUID)
   * @param {string} [req.body.userData.ip] - Dirección IP del registro
   * @param {string} [req.body.userData.userAgent] - User-Agent del navegador/dispositivo
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado del envío
   *
   * @throws {Error} Cuando falta userEmail o userData
   * @throws {Error} Cuando falla el envío del email (problemas de configuración o conexión)
   *
   * @example
   * // Solicitud POST /emails/welcome
   * {
   *   "userEmail": "nuevo.usuario@example.com",
   *   "userData": {
   *     "name": "Nuevo Usuario",
   *     "email": "nuevo.usuario@example.com",
   *     "id": "123e4567-e89b-12d3-a456-426614174000",
   *     "ip": "192.168.1.100",
   *     "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   *   }
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Email de bienvenida enviado exitosamente",
   *   "data": {
   *     "emailId": "email_1234567890",
   *     "status": "queued",
   *     "recipient": "nuevo.usuario@example.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async sendWelcomeEmail(req, res) {
    try {
      const { userEmail, userData } = req.body;

      if (!userEmail || !userData) {
        return res.status(400).json({
          success: false,
          message: "userEmail y userData son requeridos",
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.sendWelcomeEmail(userEmail, userData);

      res.status(200).json({
        success: true,
        message: "Email de bienvenida enviado exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar email de bienvenida",
        error: error.message,
      });
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   *
   * Esta función envía un email con instrucciones para recuperar la contraseña
   * cuando un usuario solicita restablecer su acceso. El email incluye un token
   * seguro, enlace de recuperación y datos de seguridad de la solicitud.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.userEmail - Dirección de email del destinatario
   * @param {Object} req.body.resetData - Datos necesarios para el proceso de recuperación
   * @param {string} req.body.resetData.name - Nombre del usuario que solicita recuperación
   * @param {string} req.body.resetData.token - Token único para validar la recuperación
   * @param {string} [req.body.resetData.ip] - Dirección IP de la solicitud
   * @param {string} [req.body.resetData.userAgent] - User-Agent del navegador/dispositivo
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado del envío
   *
   * @throws {Error} Cuando falta userEmail o resetData
   * @throws {Error} Cuando falla el envío del email (problemas de configuración o conexión)
   *
   * @example
   * // Solicitud POST /emails/password-reset
   * {
   *   "userEmail": "usuario@example.com",
   *   "resetData": {
   *     "name": "Juan Pérez",
   *     "token": "abc123def456ghi789",
   *     "ip": "192.168.1.100",
   *     "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   *   }
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Email de recuperación enviado exitosamente",
   *   "data": {
   *     "emailId": "email_1234567891",
   *     "status": "queued",
   *     "recipient": "usuario@example.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async sendPasswordResetEmail(req, res) {
    try {
      const { userEmail, resetData } = req.body;

      if (!userEmail || !resetData) {
        return res.status(400).json({
          success: false,
          message: "userEmail y resetData son requeridos",
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.sendPasswordResetEmail(
        userEmail,
        resetData
      );

      res.status(200).json({
        success: true,
        message: "Email de recuperación enviado exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar email de recuperación",
        error: error.message,
      });
    }
  }

  /**
   * Enviar email de verificación de cuenta
   *
   * Esta función envía un email para verificar la dirección de email de un usuario
   * recién registrado. Incluye un token de verificación, código numérico y enlaces
   * seguros para completar el proceso de validación de la cuenta.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.userEmail - Dirección de email del destinatario
   * @param {Object} req.body.verificationData - Datos para el proceso de verificación
   * @param {string} req.body.verificationData.name - Nombre del usuario a verificar
   * @param {string} req.body.verificationData.token - Token único para verificación
   * @param {string} req.body.verificationData.code - Código numérico alternativo
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado del envío
   *
   * @throws {Error} Cuando falta userEmail o verificationData
   * @throws {Error} Cuando falla el envío del email (problemas de configuración o conexión)
   *
   * @example
   * // Solicitud POST /emails/verification
   * {
   *   "userEmail": "nuevo.usuario@example.com",
   *   "verificationData": {
   *     "name": "Nuevo Usuario",
   *     "token": "verif_abc123def456",
   *     "code": "123456"
   *   }
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Email de verificación enviado exitosamente",
   *   "data": {
   *     "emailId": "email_1234567892",
   *     "status": "queued",
   *     "recipient": "nuevo.usuario@example.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async sendVerificationEmail(req, res) {
    try {
      const { userEmail, verificationData } = req.body;

      if (!userEmail || !verificationData) {
        return res.status(400).json({
          success: false,
          message: "userEmail y verificationData son requeridos",
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.sendVerificationEmail(
        userEmail,
        verificationData
      );

      res.status(200).json({
        success: true,
        message: "Email de verificación enviado exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar email de verificación",
        error: error.message,
      });
    }
  }

  /**
   * Enviar notificación general por email
   *
   * Esta función envía emails de notificación personalizados para diversos
   * eventos del sistema. Es flexible y permite diferentes tipos de notificaciones
   * (info, success, warning, error) con contenido completamente personalizable.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.userEmail - Dirección de email del destinatario
   * @param {Object} req.body.notificationData - Datos de la notificación
   * @param {string} req.body.notificationData.userName - Nombre del destinatario
   * @param {string} req.body.notificationData.title - Título de la notificación
   * @param {string} req.body.notificationData.message - Contenido del mensaje
   * @param {string} [req.body.notificationData.type='info'] - Tipo de notificación (info, success, warning, error)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado del envío
   *
   * @throws {Error} Cuando falta userEmail o notificationData
   * @throws {Error} Cuando falla el envío del email (problemas de configuración o conexión)
   *
   * @example
   * // Notificación de éxito
   * {
   *   "userEmail": "usuario@example.com",
   *   "notificationData": {
   *     "userName": "María González",
   *     "title": "Bienvenido al sistema",
   *     "message": "Tu cuenta ha sido activada exitosamente. Ya puedes comenzar a usar nuestros servicios.",
   *     "type": "success"
   *   }
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Notificación enviada exitosamente",
   *   "data": {
   *     "emailId": "email_1234567893",
   *     "status": "queued",
   *     "recipient": "usuario@example.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async sendNotificationEmail(req, res) {
    try {
      const { userEmail, notificationData } = req.body;

      if (!userEmail || !notificationData) {
        return res.status(400).json({
          success: false,
          message: "userEmail y notificationData son requeridos",
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.sendNotificationEmail(
        userEmail,
        notificationData
      );

      res.status(200).json({
        success: true,
        message: "Notificación enviada exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar notificación",
        error: error.message,
      });
    }
  }

  /**
   * Enviar email completamente personalizado
   *
   * Esta función permite enviar emails con contenido totalmente personalizado,
   * incluyendo plantillas, HTML puro, texto plano, datos dinámicos y archivos
   * adjuntos. Es la opción más flexible para casos de uso específicos.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.to - Dirección de email del destinatario (requerido)
   * @param {string} req.body.subject - Asunto del email (requerido)
   * @param {string} [req.body.template] - Nombre de la plantilla a usar
   * @param {Object} [req.body.data] - Datos para reemplazar en la plantilla
   * @param {string} [req.body.html] - Contenido HTML del email
   * @param {string} [req.body.text] - Contenido de texto plano alternativo
   * @param {Array} [req.body.attachments] - Array de archivos adjuntos
   * @param {string} [req.body.priority] - Prioridad del email (high, normal, low)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado del envío
   *
   * @throws {Error} Cuando faltan campos requeridos (to, subject)
   * @throws {Error} Cuando no se proporciona template, html o text
   * @throws {Error} Cuando falla el envío del email (problemas de configuración o conexión)
   *
   * @example
   * // Email con plantilla
   * {
   *   "to": "cliente@example.com",
   *   "subject": "Factura mensual - Octubre 2025",
   *   "template": "invoice",
   *   "data": {
   *     "customerName": "Empresa XYZ",
   *     "invoiceNumber": "INV-2025-001",
   *     "amount": "$1,250.00",
   *     "dueDate": "2025-11-15"
   *   },
   *   "priority": "high"
   * }
   *
   * @example
   * // Email HTML personalizado
   * {
   *   "to": "usuario@example.com",
   *   "subject": "Actualización importante del sistema",
   *   "html": "<h1>Sistema actualizado</h1><p>Se han realizado mejoras importantes...</p>",
   *   "text": "Sistema actualizado. Se han realizado mejoras importantes en la plataforma."
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Email enviado exitosamente",
   *   "data": {
   *     "emailId": "email_1234567894",
   *     "status": "queued",
   *     "recipient": "cliente@example.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async sendCustomEmail(req, res) {
    try {
      const { to, subject, template, data, html, text, attachments, priority } =
        req.body;

      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Los campos "to" y "subject" son requeridos',
        });
      }

      if (!template && !html && !text) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar template, html o text",
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.queueEmail({
        to,
        subject,
        template,
        data,
        html,
        text,
        attachments,
        priority,
      });

      res.status(200).json({
        success: true,
        message: "Email enviado exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar email personalizado",
        error: error.message,
      });
    }
  }

  /**
   * Obtener estadísticas detalladas del servicio de email
   *
   * Esta función proporciona métricas completas sobre el rendimiento y estado
   * del servicio de email, incluyendo emails enviados/exitosos/fallidos,
   * tamaño de la cola, plantillas cargadas y configuración de límites de tasa.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con estadísticas completas
   *
   * @throws {Error} Cuando falla la inicialización del servicio de email
   *
   * @example
   * // Solicitud GET /emails/stats
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Estadísticas obtenidas exitosamente",
   *   "data": {
   *     "emailsSent": 150,
   *     "emailsFailed": 3,
   *     "queueSize": 5,
   *     "templatesLoaded": 8,
   *     "rateLimitCounters": {
   *       "hourly": {
   *         "count": 12,
   *         "resetTime": 1735425600000
   *       },
   *       "daily": {
   *         "count": 45,
   *         "resetTime": 1735512000000
   *       }
   *     },
   *     "isProcessingQueue": false,
   *     "provider": "gmail"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getEmailStats(req, res) {
    try {
      const emailService = await getEmailService();
      const stats = emailService.getStats();

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

  /**
   * Obtener configuración actual del servicio de email (sin datos sensibles)
   *
   * Esta función retorna la configuración actual del sistema de email sin
   * exponer información sensible como credenciales o claves API. Útil para
   * debugging y verificación de configuración activa.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con configuración segura
   *
   * @throws {Error} Cuando falla la inicialización del servicio de email
   *
   * @example
   * // Solicitud GET /emails/config
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Configuración obtenida exitosamente",
   *   "data": {
   *     "provider": "gmail",
   *     "from": "sistema@empresa.com",
   *     "fromName": "Sistema CRUD",
   *     "queueEnabled": true,
   *     "rateLimitEnabled": true,
   *     "developmentMode": false,
   *     "templatesLoaded": 8
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getEmailConfig(req, res) {
    try {
      const config = {
        provider: emailConfig.provider,
        from: emailConfig.from,
        fromName: emailConfig.fromName,
        queueEnabled: emailConfig.queue.enabled,
        rateLimitEnabled: emailConfig.rateLimit.enabled,
        developmentMode: emailConfig.development.enabled,
        templatesLoaded: await getEmailService().then(
          (service) => service.templates.size
        ),
      };

      res.status(200).json({
        success: true,
        message: "Configuración obtenida exitosamente",
        data: config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener configuración",
        error: error.message,
      });
    }
  }

  /**
   * Enviar email de prueba para verificar configuración
   *
   * Esta función envía un email de prueba predefinido a la dirección especificada
   * para verificar que la configuración del servicio de email esté funcionando
   * correctamente. Es útil para testing y validación de configuración.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} req.body - Cuerpo de la solicitud
   * @param {string} req.body.to - Dirección de email donde enviar la prueba (requerido)
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con resultado de la prueba
   *
   * @throws {Error} Cuando falta el campo 'to'
   * @throws {Error} Cuando falla el envío del email de prueba
   *
   * @example
   * // Solicitud POST /emails/test
   * {
   *   "to": "admin@empresa.com"
   * }
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Email de prueba enviado exitosamente",
   *   "data": {
   *     "emailId": "email_test_1234567895",
   *     "status": "queued",
   *     "recipient": "admin@empresa.com"
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async testEmail(req, res) {
    try {
      const { to } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          message: 'El campo "to" es requerido',
        });
      }

      const emailService = await getEmailService();
      const result = await emailService.queueEmail({
        to,
        subject: "Email de prueba - Sistema CRUD",
        template: "notification",
        data: {
          userName: "Usuario de prueba",
          notificationTitle: "Email de prueba",
          notificationMessage:
            "Este es un email de prueba del sistema CRUD. Si recibes este mensaje, la configuración de email está funcionando correctamente.",
          notificationType: "success",
          isSuccess: true,
          successTitle: "Configuración correcta",
          successMessage: "El sistema de email está funcionando perfectamente.",
        },
      });

      res.status(200).json({
        success: true,
        message: "Email de prueba enviado exitosamente",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al enviar email de prueba",
        error: error.message,
      });
    }
  }

  /**
   * Obtener lista de plantillas de email disponibles
   *
   * Esta función retorna todas las plantillas HTML disponibles en el sistema,
   * junto con el conteo total. Útil para conocer qué plantillas pueden usarse
   * en los emails personalizados y para documentación del sistema.
   *
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   *
   * @returns {Promise<void>} No retorna valor directo, responde vía HTTP con lista de plantillas
   *
   * @throws {Error} Cuando falla la inicialización del servicio de email
   *
   * @example
   * // Solicitud GET /emails/templates
   *
   * // Respuesta exitosa (200)
   * {
   *   "success": true,
   *   "message": "Templates obtenidos exitosamente",
   *   "data": {
   *     "templates": [
   *       "welcome",
   *       "password-reset",
   *       "email-verification",
   *       "notification",
   *       "invoice",
   *       "newsletter",
   *       "account-update",
   *       "order-confirmation"
   *     ],
   *     "count": 8
   *   }
   * }
   *
   * @since 1.0.0
   * @author Sistema CRUD
   * @version 1.0.0
   */
  static async getAvailableTemplates(req, res) {
    try {
      const emailService = await getEmailService();
      const templates = Array.from(emailService.templates.keys());

      res.status(200).json({
        success: true,
        message: "Templates obtenidos exitosamente",
        data: {
          templates,
          count: templates.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error al obtener templates",
        error: error.message,
      });
    }
  }
}

module.exports = EmailController;
