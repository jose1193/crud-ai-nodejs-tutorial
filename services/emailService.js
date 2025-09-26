const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");
const handlebars = require("handlebars");
const {
  emailConfig,
  getProviderConfig,
  validateConfig,
} = require("../config/emailConfig");

/**
 * Servicio completo para envío de emails con múltiples proveedores
 *
 * Esta clase proporciona funcionalidades completas para el envío de emails,
 * incluyendo soporte para múltiples proveedores (Gmail, Outlook, etc.),
 * sistema de colas para procesamiento asíncrono, plantillas HTML con Handlebars,
 * límites de tasa configurables, logging detallado y modos de desarrollo.
 *
 * Implementa el patrón Singleton a través de la función getEmailService().
 *
 * @class
 * @since 1.0.0
 * @author Sistema CRUD
 * @version 1.0.0
 *
 * @example
 * // Usar la instancia singleton (recomendado)
 * const { getEmailService } = require('./services/emailService');
 *
 * const emailService = await getEmailService();
 *
 * // Enviar email de bienvenida
 * await emailService.sendWelcomeEmail("usuario@example.com", {
 *   name: "Juan Pérez",
 *   id: "user-uuid-123",
 *   ip: "192.168.1.100"
 * });
 *
 * @example
 * // Enviar email personalizado
 * await emailService.queueEmail({
 *   to: "cliente@example.com",
 *   subject: "Factura mensual",
 *   template: "invoice",
 *   data: {
 *     customerName: "Empresa XYZ",
 *     amount: "$1,250.00"
 *   }
 * });
 */
class EmailService {
  /**
   * Crear una nueva instancia del servicio de email
   *
   * Inicializa todas las propiedades del servicio incluyendo el transporter,
   * cola de emails, contadores de estadísticas y límites de tasa. Inicia
   * automáticamente la inicialización del servicio.
   *
   * @constructor
   *
   * @property {Object} transporter - Instancia de Nodemailer para envío de emails
   * @property {Map<string, Function>} templates - Mapa de plantillas Handlebars compiladas
   * @property {Array} emailQueue - Cola de emails pendientes de envío
   * @property {boolean} isProcessingQueue - Estado del procesador de cola
   * @property {Array} sentEmails - Historial de emails enviados exitosamente
   * @property {Array} failedEmails - Historial de emails que fallaron
   * @property {Object} rateLimitCounters - Contadores para límites de tasa
   * @property {Object} rateLimitCounters.hourly - Contador por hora
   * @property {number} rateLimitCounters.hourly.count - Emails enviados en la hora actual
   * @property {number} rateLimitCounters.hourly.resetTime - Timestamp de reinicio
   * @property {Object} rateLimitCounters.daily - Contador diario
   * @property {number} rateLimitCounters.daily.count - Emails enviados en el día actual
   * @property {number} rateLimitCounters.daily.resetTime - Timestamp de reinicio
   *
   * @example
   * const emailService = new EmailService();
   * // Inicializa automáticamente con init()
   */
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.emailQueue = [];
    this.isProcessingQueue = false;
    this.sentEmails = [];
    this.failedEmails = [];
    this.rateLimitCounters = {
      hourly: { count: 0, resetTime: Date.now() + 3600000 },
      daily: { count: 0, resetTime: Date.now() + 86400000 },
    };

    this.init();
  }

  /**
   * Inicializar el servicio completo de email
   *
   * Este método inicializa todos los componentes del servicio de email:
   * valida la configuración, crea el transporter, carga las plantillas y
   * inicia el procesador de cola si está habilitado.
   *
   * @returns {Promise<void>} No retorna valor, inicializa el servicio
   *
   * @throws {Error} Cuando la configuración es inválida
   * @throws {Error} Cuando falla la creación del transporter
   * @throws {Error} Cuando falla la carga de plantillas
   *
   * @example
   * const emailService = new EmailService();
   * // El constructor llama automáticamente a init()
   * // await emailService.init(); // No necesario llamar manualmente
   */
  async init() {
    try {
      // Validar configuración
      const validation = validateConfig();
      if (!validation.isValid) {
        throw new Error(
          `Configuración inválida: ${validation.errors.join(", ")}`
        );
      }

      // Crear transporter
      await this.createTransporter();

      // Cargar templates
      await this.loadTemplates();

      // Iniciar procesamiento de cola
      if (emailConfig.queue.enabled) {
        this.startQueueProcessor();
      }

      this.log("info", "EmailService inicializado correctamente");
    } catch (error) {
      this.log("error", `Error al inicializar EmailService: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crear y configurar el transporter de Nodemailer
   *
   * Este método obtiene la configuración específica del proveedor de email
   * (Gmail, Outlook, etc.) y crea una instancia de transporter de Nodemailer.
   * También verifica la conexión probando el envío de un email de prueba.
   *
   * @returns {Promise<void>} No retorna valor, configura el transporter
   *
   * @throws {Error} Cuando falla la creación del transporter
   * @throws {Error} Cuando la verificación de conexión falla
   *
   * @private
   * @example
   * // Se llama automáticamente durante init()
   * await this.createTransporter();
   * // this.transporter ahora está disponible para envío
   */
  async createTransporter() {
    const config = getProviderConfig();

    try {
      this.transporter = nodemailer.createTransporter(config);

      // Verificar conexión
      await this.transporter.verify();
      this.log(
        "info",
        `Transporter creado exitosamente para: ${emailConfig.provider}`
      );
    } catch (error) {
      this.log("error", `Error al crear transporter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cargar y compilar todas las plantillas HTML disponibles
   *
   * Este método escanea el directorio de plantillas, lee todos los archivos
   * .html y los compila usando Handlebars para crear funciones reutilizables
   * que pueden renderizar contenido dinámico.
   *
   * @returns {Promise<void>} No retorna valor, carga las plantillas en memoria
   *
   * @throws {Error} Cuando falla la lectura del directorio de plantillas
   * @throws {Error} Cuando falla la lectura de un archivo de plantilla
   *
   * @private
   * @example
   * // Se llama automáticamente durante init()
   * await this.loadTemplates();
   * // this.templates ahora contiene todas las plantillas compiladas
   *
   * // Usar una plantilla cargada
   * const html = this.templates.get('welcome')({
   *   userName: 'Juan',
   *   userEmail: 'juan@example.com'
   * });
   */
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, "../templates");
      const files = await fs.readdir(templatesDir);

      for (const file of files) {
        if (file.endsWith(".html")) {
          const templateName = file.replace(".html", "");
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, "utf-8");

          this.templates.set(templateName, handlebars.compile(templateContent));
          this.log("debug", `Template cargado: ${templateName}`);
        }
      }

      this.log("info", `${this.templates.size} templates cargados`);
    } catch (error) {
      this.log("error", `Error al cargar templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Renderizar template con datos
   */
  renderTemplate(templateName, data = {}) {
    if (!this.templates.has(templateName)) {
      throw new Error(`Template no encontrado: ${templateName}`);
    }

    // Datos por defecto
    const defaultData = {
      companyName: emailConfig.fromName,
      companyAddress: "123 Main Street, Ciudad, País",
      footerText: `© ${new Date().getFullYear()} ${
        emailConfig.fromName
      }. Todos los derechos reservados.`,
      socialLinks: "",
      unsubscribeUrl: `${emailConfig.templates.baseUrl}/unsubscribe`,
      language: emailConfig.templates.defaultLanguage,
      title: data.title || "Notificación",
      headerSubtitle: data.headerSubtitle || "Sistema de gestión de usuarios",
    };

    const templateData = { ...defaultData, ...data };

    // Si hay un template base, renderizar el contenido dentro de él
    if (templateName !== "base" && this.templates.has("base")) {
      const contentHtml = this.templates.get(templateName)(templateData);
      return this.templates.get("base")({
        ...templateData,
        content: contentHtml,
      });
    }

    return this.templates.get(templateName)(templateData);
  }

  /**
   * Enviar email individual
   */
  async sendEmail(options) {
    try {
      // Verificar rate limit
      if (!this.checkRateLimit()) {
        throw new Error("Rate limit excedido");
      }

      const emailOptions = await this.prepareEmailOptions(options);

      // En desarrollo, guardar en archivo si está configurado
      if (
        emailConfig.development.enabled &&
        emailConfig.development.saveToFile
      ) {
        await this.saveEmailToFile(emailOptions);
      }

      let result;
      if (emailConfig.development.enabled && !process.env.FORCE_EMAIL_SEND) {
        // En desarrollo, simular envío
        result = this.simulateEmailSend(emailOptions);
        this.log("info", `Email simulado enviado a: ${emailOptions.to}`);
      } else {
        // Envío real
        result = await this.transporter.sendMail(emailOptions);
        this.log("info", `Email enviado exitosamente a: ${emailOptions.to}`);
      }

      // Actualizar contadores
      this.updateRateLimitCounters();
      this.sentEmails.push({
        ...emailOptions,
        sentAt: new Date(),
        messageId: result.messageId,
        response: result.response,
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (error) {
      this.log("error", `Error al enviar email: ${error.message}`);

      this.failedEmails.push({
        ...options,
        error: error.message,
        failedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Preparar opciones del email
   */
  async prepareEmailOptions(options) {
    const {
      to,
      subject,
      template,
      data = {},
      attachments = [],
      priority = "normal",
    } = options;

    if (!to || !subject) {
      throw new Error('Los campos "to" y "subject" son requeridos');
    }

    let html = "";
    let text = "";

    if (template) {
      html = this.renderTemplate(template, data);
      text = this.htmlToText(html);
    } else if (options.html) {
      html = options.html;
      text = options.text || this.htmlToText(html);
    } else if (options.text) {
      text = options.text;
    } else {
      throw new Error("Debe proporcionar template, html o text");
    }

    return {
      from: `${emailConfig.fromName} <${emailConfig.from}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text,
      attachments,
      priority,
      headers: {
        "X-Mailer": "CRUD-Email-Service",
        "X-Priority":
          priority === "high" ? "1" : priority === "low" ? "5" : "3",
      },
    };
  }

  /**
   * Convertir HTML a texto plano básico
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Agregar un email a la cola de envío o enviarlo inmediatamente
   *
   * Este método es el punto de entrada principal para enviar emails. Si la cola
   * está habilitada, el email se agrega a la cola para procesamiento asíncrono.
   * Si la cola está deshabilitada, el email se envía inmediatamente.
   *
   * @param {Object} options - Opciones completas del email
   * @param {string} options.to - Dirección de email del destinatario (requerido)
   * @param {string} options.subject - Asunto del email (requerido)
   * @param {string} [options.template] - Nombre de la plantilla a usar
   * @param {Object} [options.data] - Datos para reemplazar en la plantilla
   * @param {string} [options.html] - Contenido HTML personalizado
   * @param {string} [options.text] - Contenido de texto plano alternativo
   * @param {Array} [options.attachments] - Array de archivos adjuntos
   * @param {string} [options.priority] - Prioridad del email ('high', 'normal', 'low')
   *
   * @returns {Promise<Object>} Resultado del envío con ID y estado
   * @returns {string} return.emailId - ID único del email
   * @returns {string} return.status - Estado del envío ('queued' o 'sent')
   * @returns {string} return.recipient - Email del destinatario
   *
   * @throws {Error} Cuando faltan campos requeridos (to, subject)
   * @throws {Error} Cuando no se proporciona template, html o text
   * @throws {Error} Cuando falla el envío inmediato (si cola deshabilitada)
   *
   * @example
   * const emailService = await getEmailService();
   *
   * // Email con plantilla
   * const result1 = await emailService.queueEmail({
   *   to: "cliente@example.com",
   *   subject: "Factura mensual - Octubre 2025",
   *   template: "invoice",
   *   data: {
   *     customerName: "Empresa XYZ",
   *     invoiceNumber: "INV-2025-001",
   *     amount: "$1,250.00",
   *     dueDate: "2025-11-15"
   *   },
   *   priority: "high"
   * });
   *
   * @example
   * // Email HTML personalizado
   * const result2 = await emailService.queueEmail({
   *   to: "usuario@example.com",
   *   subject: "Actualización del sistema",
   *   html: "<h1>Sistema actualizado</h1><p>Se han realizado mejoras...</p>",
   *   text: "Sistema actualizado. Se han realizado mejoras importantes."
   * });
   *
   * @example
   * // Email con adjuntos
   * const result3 = await emailService.queueEmail({
   *   to: "cliente@example.com",
   *   subject: "Documentos adjuntos",
   *   template: "notification",
   *   data: { message: "Adjuntamos los documentos solicitados." },
   *   attachments: [
   *     {
   *       filename: "contrato.pdf",
   *       path: "/path/to/contrato.pdf"
   *     }
   *   ]
   * });
   */
  async queueEmail(options) {
    if (!emailConfig.queue.enabled) {
      return await this.sendEmail(options);
    }

    const queueItem = {
      id: this.generateId(),
      options,
      attempts: 0,
      maxAttempts: emailConfig.retry.attempts,
      addedAt: new Date(),
      status: "pending",
    };

    this.emailQueue.push(queueItem);
    this.log("info", `Email agregado a la cola: ${queueItem.id}`);

    return {
      success: true,
      queueId: queueItem.id,
      message: "Email agregado a la cola de envío",
    };
  }

  /**
   * Procesar cola de emails
   */
  async startQueueProcessor() {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    this.log("info", "Procesador de cola iniciado");

    const processQueue = async () => {
      while (this.emailQueue.length > 0) {
        const batch = this.emailQueue.splice(0, emailConfig.queue.batchSize);

        const promises = batch.map(async (item) => {
          try {
            await this.sendEmail(item.options);
            item.status = "sent";
            this.log("info", `Email de cola enviado: ${item.id}`);
          } catch (error) {
            item.attempts++;
            item.lastError = error.message;

            if (item.attempts < item.maxAttempts) {
              item.status = "retrying";
              // Reagregar a la cola con delay
              setTimeout(() => {
                this.emailQueue.push(item);
              }, this.calculateRetryDelay(item.attempts));

              this.log(
                "warn",
                `Reintentando email ${item.id} (intento ${item.attempts}/${item.maxAttempts})`
              );
            } else {
              item.status = "failed";
              this.log(
                "error",
                `Email fallido definitivamente: ${item.id} - ${error.message}`
              );
            }
          }
        });

        await Promise.allSettled(promises);

        // Delay entre batches
        if (this.emailQueue.length > 0) {
          await this.sleep(emailConfig.queue.delay);
        }
      }

      // Revisar cola cada 5 segundos
      setTimeout(processQueue, 5000);
    };

    processQueue();
  }

  /**
   * Calcular delay para reintentos
   */
  calculateRetryDelay(attempt) {
    const baseDelay = emailConfig.retry.delay;

    if (emailConfig.retry.backoff === "exponential") {
      return baseDelay * Math.pow(2, attempt - 1);
    }

    return baseDelay * attempt;
  }

  /**
   * Verificar rate limit
   */
  checkRateLimit() {
    if (!emailConfig.rateLimit.enabled) return true;

    const now = Date.now();

    // Reset contadores si es necesario
    if (now > this.rateLimitCounters.hourly.resetTime) {
      this.rateLimitCounters.hourly = {
        count: 0,
        resetTime: now + 3600000,
      };
    }

    if (now > this.rateLimitCounters.daily.resetTime) {
      this.rateLimitCounters.daily = {
        count: 0,
        resetTime: now + 86400000,
      };
    }

    // Verificar límites
    if (
      this.rateLimitCounters.hourly.count >= emailConfig.rateLimit.maxPerHour
    ) {
      return false;
    }

    if (this.rateLimitCounters.daily.count >= emailConfig.rateLimit.maxPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Actualizar contadores de rate limit
   */
  updateRateLimitCounters() {
    this.rateLimitCounters.hourly.count++;
    this.rateLimitCounters.daily.count++;
  }

  /**
   * Simular envío de email en desarrollo
   */
  simulateEmailSend(options) {
    if (emailConfig.development.logToConsole) {
      console.log("\n📧 EMAIL SIMULADO:");
      console.log(`De: ${options.from}`);
      console.log(`Para: ${options.to}`);
      console.log(`Asunto: ${options.subject}`);
      console.log(`Contenido: ${options.text.substring(0, 100)}...`);
      console.log("─────────────────────────────────\n");
    }

    return {
      messageId: `simulated-${Date.now()}@localhost`,
      response: "Email simulado en modo desarrollo",
    };
  }

  /**
   * Guardar email en archivo (desarrollo)
   */
  async saveEmailToFile(emailOptions) {
    try {
      const logsDir = path.join(__dirname, "../logs");
      await fs.mkdir(logsDir, { recursive: true });

      const filePath = path.join(logsDir, emailConfig.development.filePath);
      const emailData = {
        timestamp: new Date().toISOString(),
        ...emailOptions,
      };

      let existingData = [];
      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        existingData = JSON.parse(fileContent);
      } catch (error) {
        // Archivo no existe, crear nuevo
      }

      existingData.push(emailData);
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
    } catch (error) {
      this.log("error", `Error al guardar email en archivo: ${error.message}`);
    }
  }

  /**
   * Métodos de conveniencia para templates predefinidos
   */

  /**
   * Enviar email de bienvenida personalizado a un nuevo usuario
   *
   * Este método envía un email de bienvenida predefinido con información
   * personalizada del usuario, incluyendo datos de registro, IP y dispositivo.
   * Utiliza la plantilla 'welcome' y datos estructurados.
   *
   * @param {string} userEmail - Dirección de email del destinatario
   * @param {Object} userData - Datos del usuario para personalizar el email
   * @param {string} userData.name - Nombre completo del usuario
   * @param {string} userData.email - Email del usuario (debe coincidir con userEmail)
   * @param {string} userData.id - ID único del usuario (UUID)
   * @param {string} [userData.ip] - Dirección IP del registro
   * @param {string} [userData.userAgent] - User-Agent del navegador/dispositivo
   *
   * @returns {Promise<Object>} Resultado del envío con ID y estado
   * @returns {string} return.emailId - ID único del email enviado
   * @returns {string} return.status - Estado del envío ('queued' o 'sent')
   * @returns {string} return.recipient - Email del destinatario
   *
   * @throws {Error} Cuando falla el envío del email
   *
   * @example
   * const emailService = await getEmailService();
   *
   * const result = await emailService.sendWelcomeEmail(
   *   "nuevo.usuario@example.com",
   *   {
   *     name: "Nuevo Usuario",
   *     email: "nuevo.usuario@example.com",
   *     id: "123e4567-e89b-12d3-a456-426614174000",
   *     ip: "192.168.1.100",
   *     userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   *   }
   * );
   *
   * console.log(result);
   * // {
   * //   emailId: "email_1234567890",
   * //   status: "queued",
   * //   recipient: "nuevo.usuario@example.com"
   * // }
   */
  async sendWelcomeEmail(userEmail, userData) {
    return await this.queueEmail({
      to: userEmail,
      subject: `¡Bienvenido a ${emailConfig.fromName}!`,
      template: "welcome",
      data: {
        userName: userData.name,
        userEmail: userData.email,
        userId: userData.id,
        registrationDate: new Date().toLocaleDateString("es-ES"),
        registrationIP: userData.ip || "No disponible",
        userAgent: userData.userAgent || "No disponible",
        loginUrl: `${emailConfig.templates.baseUrl}/login`,
      },
    });
  }

  async sendPasswordResetEmail(userEmail, resetData) {
    return await this.queueEmail({
      to: userEmail,
      subject: "Recuperación de contraseña",
      template: "password-reset",
      data: {
        userName: resetData.name,
        resetUrl: `${emailConfig.templates.baseUrl}/reset-password?token=${resetData.token}`,
        resetToken: resetData.token,
        expirationTime: "1 hora",
        requestDate: new Date().toLocaleString("es-ES"),
        requestIP: resetData.ip || "No disponible",
        userAgent: resetData.userAgent || "No disponible",
      },
    });
  }

  async sendVerificationEmail(userEmail, verificationData) {
    return await this.queueEmail({
      to: userEmail,
      subject: "Verificación de email",
      template: "email-verification",
      data: {
        userName: verificationData.name,
        userEmail: userEmail,
        verificationUrl: `${emailConfig.templates.baseUrl}/verify-email?token=${verificationData.token}`,
        verificationCode: verificationData.code,
        expirationTime: "24 horas",
        requestDate: new Date().toLocaleString("es-ES"),
        expirationDate: new Date(Date.now() + 86400000).toLocaleString("es-ES"),
      },
    });
  }

  async sendNotificationEmail(userEmail, notificationData) {
    return await this.queueEmail({
      to: userEmail,
      subject: notificationData.title,
      template: "notification",
      data: {
        userName: notificationData.userName,
        notificationTitle: notificationData.title,
        notificationMessage: notificationData.message,
        notificationType: notificationData.type || "info",
        notificationDate: new Date().toLocaleString("es-ES"),
        notificationId: this.generateId(),
        ...notificationData,
      },
    });
  }

  /**
   * Obtener estadísticas completas del servicio de email
   *
   * Este método retorna métricas detalladas sobre el rendimiento y estado
   * actual del servicio de email, incluyendo contadores de envío, estado
   * de la cola, plantillas cargadas y configuración de límites de tasa.
   *
   * @returns {Object} Estadísticas completas del servicio
   * @returns {number} return.emailsSent - Total de emails enviados exitosamente
   * @returns {number} return.emailsFailed - Total de emails que fallaron
   * @returns {number} return.queueSize - Número de emails en cola pendientes
   * @returns {number} return.templatesLoaded - Número de plantillas cargadas
   * @returns {Object} return.rateLimitCounters - Estado actual de límites de tasa
   * @returns {boolean} return.isProcessingQueue - Si el procesador de cola está activo
   * @returns {string} return.provider - Proveedor de email configurado
   *
   * @example
   * const emailService = await getEmailService();
   * const stats = emailService.getStats();
   *
   * console.log("Estadísticas del servicio:");
   * console.log(`Emails enviados: ${stats.emailsSent}`);
   * console.log(`Emails fallidos: ${stats.emailsFailed}`);
   * console.log(`En cola: ${stats.queueSize}`);
   * console.log(`Plantillas: ${stats.templatesLoaded}`);
   * console.log(`Procesando cola: ${stats.isProcessingQueue}`);
   *
   * // Resultado típico:
   * // {
   * //   emailsSent: 150,
   * //   emailsFailed: 3,
   * //   queueSize: 5,
   * //   templatesLoaded: 8,
   * //   rateLimitCounters: { hourly: {...}, daily: {...} },
   * //   isProcessingQueue: true,
   * //   provider: "gmail"
   * // }
   */
  getStats() {
    return {
      emailsSent: this.sentEmails.length,
      emailsFailed: this.failedEmails.length,
      queueSize: this.emailQueue.length,
      templatesLoaded: this.templates.size,
      rateLimitCounters: this.rateLimitCounters,
      isProcessingQueue: this.isProcessingQueue,
      provider: emailConfig.provider,
    };
  }

  /**
   * Utilidades
   */

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  log(level, message) {
    if (!emailConfig.logging.enabled) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (emailConfig.development.enabled || level === "error") {
      console.log(logMessage);
    }

    // Aquí podrías agregar logging a archivo si lo necesitas
  }
}

// Instancia singleton
let emailServiceInstance = null;

/**
 * Obtener la instancia singleton del servicio de email
 *
 * Esta función implementa el patrón Singleton para garantizar que solo exista
 * una instancia del servicio de email en toda la aplicación. Si no existe una
 * instancia, crea una nueva y la inicializa. Si ya existe, retorna la instancia
 * existente.
 *
 * @returns {Promise<EmailService>} Instancia inicializada del servicio de email
 *
 * @throws {Error} Cuando falla la inicialización del servicio
 *
 * @example
 * // Obtener el servicio (primera llamada inicializa)
 * const emailService = await getEmailService();
 *
 * // Usar el servicio
 * await emailService.sendWelcomeEmail("user@example.com", userData);
 *
 * // Llamadas posteriores retornan la misma instancia
 * const sameService = await getEmailService();
 * console.log(emailService === sameService); // true
 *
 * @since 1.0.0
 * @author Sistema CRUD
 * @version 1.0.0
 */
const getEmailService = async () => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
    await emailServiceInstance.init();
  }
  return emailServiceInstance;
};

/**
 * Exportaciones del módulo de servicio de email
 *
 * @module emailService
 * @since 1.0.0
 * @author Sistema CRUD
 * @version 1.0.0
 */
module.exports = {
  /**
   * Clase principal del servicio de email
   * @type {typeof EmailService}
   */
  EmailService,

  /**
   * Función para obtener la instancia singleton del servicio de email
   * @type {Function}
   * @returns {Promise<EmailService>} Instancia del servicio de email
   */
  getEmailService,
};
