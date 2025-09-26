/**
 * Mock completo del EmailService para testing
 * Simula todas las funcionalidades del servicio real con control total para testing
 */

const { EventEmitter } = require("events");

class EmailServiceMock extends EventEmitter {
  constructor(config = {}) {
    super();

    // Configuración por defecto
    this.config = {
      shouldFailSend: false,
      shouldFailInit: false,
      shouldFailValidation: false,
      failureRate: 0, // 0-1, probabilidad de fallo
      sendDelay: 0, // ms de delay para simular latencia
      initDelay: 0,
      validationDelay: 0,
      dailyLimit: null,
      hourlyLimit: null,
      enableTracking: true,
      enableRateLimit: true,
      enableQueue: true,
      templates: [
        "welcome",
        "password-reset",
        "email-verification",
        "notification",
      ],
      ...config,
    };

    // Estado interno
    this.isInitialized = false;
    this.transporter = null;
    this.templates = new Map();
    this.emailQueue = [];
    this.isProcessingQueue = false;

    // Tracking de actividad
    this.sentEmails = [];
    this.failedEmails = [];
    this.validatedEmails = [];
    this.methodCalls = new Map();
    this.callHistory = [];

    // Contadores de rate limiting
    this.rateLimitCounters = {
      hourly: { count: 0, resetTime: Date.now() + 3600000 },
      daily: { count: 0, resetTime: Date.now() + 86400000 },
    };

    // Estadísticas
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      totalValidated: 0,
      dailySent: 0,
      hourlySent: 0,
      queueSize: 0,
      templatesLoaded: 0,
    };

    // Auto-inicializar si no está configurado para fallar
    if (!this.config.shouldFailInit) {
      this.init();
    }
  }

  /**
   * Inicializar el servicio mock
   */
  async init() {
    this._recordCall("init", []);

    if (this.config.shouldFailInit) {
      throw new Error("Mock configured to fail initialization");
    }

    if (this.config.initDelay > 0) {
      await this._sleep(this.config.initDelay);
    }

    // Simular carga de templates
    this.config.templates.forEach((templateName) => {
      this.templates.set(templateName, this._createMockTemplate(templateName));
    });

    this.stats.templatesLoaded = this.templates.size;
    this.isInitialized = true;
    this.transporter = { verify: () => Promise.resolve() };

    this.emit("initialized");
    return true;
  }

  /**
   * Crear transporter mock
   */
  async createTransporter() {
    this._recordCall("createTransporter", []);

    if (this.config.shouldFailInit) {
      throw new Error("Mock transporter creation failed");
    }

    this.transporter = {
      verify: () => Promise.resolve(),
      sendMail: (options) => this._mockSendMail(options),
    };

    return this.transporter;
  }

  /**
   * Cargar templates mock
   */
  async loadTemplates() {
    this._recordCall("loadTemplates", []);

    this.config.templates.forEach((templateName) => {
      this.templates.set(templateName, this._createMockTemplate(templateName));
    });

    this.stats.templatesLoaded = this.templates.size;
    return this.templates.size;
  }

  /**
   * Renderizar template mock
   */
  renderTemplate(templateName, data = {}) {
    this._recordCall("renderTemplate", [templateName, data]);

    if (!this.templates.has(templateName)) {
      throw new Error(`Template no encontrado: ${templateName}`);
    }

    const template = this.templates.get(templateName);
    return template(data);
  }

  /**
   * Enviar email individual (método principal)
   */
  async sendEmail(options) {
    return await this.send(options);
  }

  /**
   * Enviar email (alias para compatibilidad)
   */
  async send(options) {
    this._recordCall("send", [options]);

    if (!this.isInitialized) {
      throw new Error("EmailService not initialized");
    }

    // Simular delay
    if (this.config.sendDelay > 0) {
      await this._sleep(this.config.sendDelay);
    }

    // Verificar rate limit
    if (this.config.enableRateLimit && !this._checkRateLimit()) {
      const error = new Error("Rate limit excedido");
      this.failedEmails.push({
        ...options,
        error: error.message,
        failedAt: new Date(),
      });
      this.stats.totalFailed++;
      throw error;
    }

    // Simular fallo aleatorio
    if (this._shouldFail()) {
      const error = new Error("Mock email send failure");
      this.failedEmails.push({
        ...options,
        error: error.message,
        failedAt: new Date(),
      });
      this.stats.totalFailed++;
      this.emit("sendFailed", { options, error });
      throw error;
    }

    // Validar opciones básicas
    if (!options.to || !options.subject) {
      const error = new Error('Los campos "to" y "subject" son requeridos');
      this.failedEmails.push({
        ...options,
        error: error.message,
        failedAt: new Date(),
      });
      this.stats.totalFailed++;
      throw error;
    }

    // Preparar resultado exitoso
    const result = {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      response: "Mock email sent successfully",
      timestamp: new Date().toISOString(),
    };

    // Registrar email enviado
    const emailRecord = {
      ...options,
      sentAt: new Date(),
      messageId: result.messageId,
      response: result.response,
    };

    this.sentEmails.push(emailRecord);
    this.stats.totalSent++;
    this._updateRateLimitCounters();

    this.emit("emailSent", emailRecord);
    return result;
  }

  /**
   * Agregar email a la cola
   */
  async queueEmail(options) {
    this._recordCall("queueEmail", [options]);

    if (!this.config.enableQueue) {
      return await this.send(options);
    }

    const queueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      options,
      attempts: 0,
      maxAttempts: 3,
      addedAt: new Date(),
      status: "pending",
    };

    this.emailQueue.push(queueItem);
    this.stats.queueSize = this.emailQueue.length;

    this.emit("emailQueued", queueItem);

    return {
      success: true,
      queueId: queueItem.id,
      message: "Email agregado a la cola de envío",
    };
  }

  /**
   * Enviar lote de emails
   */
  async sendBatch(emails) {
    this._recordCall("sendBatch", [emails]);

    const results = {
      successful: 0,
      failed: 0,
      results: [],
    };

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.results.push({ email, result, success: true });
        results.successful++;
      } catch (error) {
        results.results.push({ email, error, success: false });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Métodos de conveniencia para templates predefinidos
   */

  async sendWelcomeEmail(userEmail, userData) {
    this._recordCall("sendWelcomeEmail", [userEmail, userData]);

    return await this.queueEmail({
      to: userEmail,
      subject: `¡Bienvenido!`,
      template: "welcome",
      data: {
        userName: userData.name,
        userEmail: userData.email,
        userId: userData.id,
        ...userData,
      },
    });
  }

  async sendPasswordResetEmail(userEmail, resetData) {
    this._recordCall("sendPasswordResetEmail", [userEmail, resetData]);

    return await this.queueEmail({
      to: userEmail,
      subject: "Recuperación de contraseña",
      template: "password-reset",
      data: {
        userName: resetData.name,
        resetToken: resetData.token,
        ...resetData,
      },
    });
  }

  async sendVerificationEmail(userEmail, verificationData) {
    this._recordCall("sendVerificationEmail", [userEmail, verificationData]);

    return await this.queueEmail({
      to: userEmail,
      subject: "Verificación de email",
      template: "email-verification",
      data: {
        userName: verificationData.name,
        verificationCode: verificationData.code,
        ...verificationData,
      },
    });
  }

  async sendNotificationEmail(userEmail, notificationData) {
    this._recordCall("sendNotificationEmail", [userEmail, notificationData]);

    return await this.queueEmail({
      to: userEmail,
      subject: notificationData.title,
      template: "notification",
      data: {
        userName: notificationData.userName,
        notificationTitle: notificationData.title,
        notificationMessage: notificationData.message,
        ...notificationData,
      },
    });
  }

  /**
   * Validar email
   */
  async validate(email) {
    this._recordCall("validate", [email]);

    if (this.config.validationDelay > 0) {
      await this._sleep(this.config.validationDelay);
    }

    if (this.config.shouldFailValidation) {
      throw new Error("Mock validation failure");
    }

    const isValid = this._isValidEmail(email);
    const validationResult = {
      email,
      isValid,
      timestamp: new Date().toISOString(),
      reason: isValid ? "Valid format" : "Invalid email format",
    };

    this.validatedEmails.push(validationResult);
    this.stats.totalValidated++;

    this.emit("emailValidated", validationResult);
    return validationResult;
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    this._recordCall("getStats", []);

    return {
      ...this.stats,
      emailsSent: this.sentEmails.length,
      emailsFailed: this.failedEmails.length,
      emailsValidated: this.validatedEmails.length,
      queueSize: this.emailQueue.length,
      templatesLoaded: this.templates.size,
      rateLimitCounters: this.rateLimitCounters,
      isProcessingQueue: this.isProcessingQueue,
      provider: "mock",
    };
  }

  /**
   * Métodos de testing y control
   */

  // Obtener emails enviados
  getSentEmails() {
    return [...this.sentEmails];
  }

  // Obtener emails fallidos
  getFailedEmails() {
    return [...this.failedEmails];
  }

  // Obtener emails validados
  getValidatedEmails() {
    return [...this.validatedEmails];
  }

  // Obtener cola de emails
  getEmailQueue() {
    return [...this.emailQueue];
  }

  // Obtener historial de llamadas
  getCallHistory() {
    return [...this.callHistory];
  }

  // Obtener contador de llamadas para un método
  getCallCount(methodName = null) {
    if (methodName) {
      return this.methodCalls.get(methodName) || 0;
    }
    return this.callHistory.length;
  }

  // Verificar si un método fue llamado
  wasMethodCalled(methodName) {
    return (
      this.methodCalls.has(methodName) && this.methodCalls.get(methodName) > 0
    );
  }

  // Obtener argumentos de la última llamada a un método
  getLastCallArgs(methodName) {
    const calls = this.callHistory.filter((call) => call.method === methodName);
    return calls.length > 0 ? calls[calls.length - 1].args : null;
  }

  // Limpiar historial y estadísticas
  reset() {
    this.sentEmails = [];
    this.failedEmails = [];
    this.validatedEmails = [];
    this.emailQueue = [];
    this.methodCalls.clear();
    this.callHistory = [];

    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      totalValidated: 0,
      dailySent: 0,
      hourlySent: 0,
      queueSize: 0,
      templatesLoaded: this.templates.size,
    };

    this.rateLimitCounters = {
      hourly: { count: 0, resetTime: Date.now() + 3600000 },
      daily: { count: 0, resetTime: Date.now() + 86400000 },
    };
  }

  // Configurar comportamiento dinámicamente
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Simular procesamiento de cola
  async processQueue() {
    this._recordCall("processQueue", []);

    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.emailQueue.length > 0) {
      const item = this.emailQueue.shift();
      try {
        await this.send(item.options);
        item.status = "sent";
      } catch (error) {
        item.status = "failed";
        item.error = error.message;
      }
    }

    this.isProcessingQueue = false;
    this.stats.queueSize = this.emailQueue.length;
  }

  /**
   * Métodos privados
   */

  _recordCall(methodName, args) {
    const callRecord = {
      method: methodName,
      args: args,
      timestamp: new Date().toISOString(),
    };

    this.callHistory.push(callRecord);
    this.methodCalls.set(
      methodName,
      (this.methodCalls.get(methodName) || 0) + 1
    );
  }

  _shouldFail() {
    if (this.config.shouldFailSend) return true;
    if (this.config.failureRate > 0) {
      return Math.random() < this.config.failureRate;
    }
    return false;
  }

  _checkRateLimit() {
    const now = Date.now();

    // Reset contadores si es necesario
    if (now > this.rateLimitCounters.hourly.resetTime) {
      this.rateLimitCounters.hourly = { count: 0, resetTime: now + 3600000 };
      this.stats.hourlySent = 0;
    }

    if (now > this.rateLimitCounters.daily.resetTime) {
      this.rateLimitCounters.daily = { count: 0, resetTime: now + 86400000 };
      this.stats.dailySent = 0;
    }

    // Verificar límites
    if (
      this.config.hourlyLimit &&
      this.rateLimitCounters.hourly.count >= this.config.hourlyLimit
    ) {
      return false;
    }

    if (
      this.config.dailyLimit &&
      this.rateLimitCounters.daily.count >= this.config.dailyLimit
    ) {
      return false;
    }

    return true;
  }

  _updateRateLimitCounters() {
    this.rateLimitCounters.hourly.count++;
    this.rateLimitCounters.daily.count++;
    this.stats.hourlySent++;
    this.stats.dailySent++;
  }

  _createMockTemplate(templateName) {
    return (data) => {
      return `
        <html>
          <body>
            <h1>Mock Template: ${templateName}</h1>
            <div>Data: ${JSON.stringify(data, null, 2)}</div>
            <p>This is a mock email template for testing purposes.</p>
          </body>
        </html>
      `;
    };
  }

  async _mockSendMail(options) {
    return {
      messageId: `mock-${Date.now()}@localhost`,
      response: "Mock email sent",
      accepted: [options.to],
      rejected: [],
      pending: [],
      envelope: { from: options.from, to: [options.to] },
    };
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = EmailServiceMock;
