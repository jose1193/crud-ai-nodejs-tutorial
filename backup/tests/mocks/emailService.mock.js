/**
 * Mock del EmailService para testing
 */

const emailServiceMock = {
  // Estado del mock
  _calls: [],
  _shouldFail: false,
  _failureMessage: "Mock email service failure",

  // Métodos mockeados
  async sendWelcomeEmail(email, userData) {
    this._calls.push({
      method: "sendWelcomeEmail",
      email,
      userData,
      timestamp: new Date().toISOString(),
    });

    if (this._shouldFail) {
      throw new Error(this._failureMessage);
    }

    return {
      success: true,
      messageId: `mock-message-${Date.now()}`,
      email,
      template: "welcome",
    };
  },

  async sendPasswordResetEmail(email, resetData) {
    this._calls.push({
      method: "sendPasswordResetEmail",
      email,
      resetData,
      timestamp: new Date().toISOString(),
    });

    if (this._shouldFail) {
      throw new Error(this._failureMessage);
    }

    return {
      success: true,
      messageId: `mock-message-${Date.now()}`,
      email,
      template: "password-reset",
    };
  },

  async sendVerificationEmail(email, verificationData) {
    this._calls.push({
      method: "sendVerificationEmail",
      email,
      verificationData,
      timestamp: new Date().toISOString(),
    });

    if (this._shouldFail) {
      throw new Error(this._failureMessage);
    }

    return {
      success: true,
      messageId: `mock-message-${Date.now()}`,
      email,
      template: "verification",
    };
  },

  async sendNotificationEmail(email, notificationData) {
    this._calls.push({
      method: "sendNotificationEmail",
      email,
      notificationData,
      timestamp: new Date().toISOString(),
    });

    if (this._shouldFail) {
      throw new Error(this._failureMessage);
    }

    return {
      success: true,
      messageId: `mock-message-${Date.now()}`,
      email,
      template: "notification",
    };
  },

  async queueEmail(emailData) {
    this._calls.push({
      method: "queueEmail",
      emailData,
      timestamp: new Date().toISOString(),
    });

    if (this._shouldFail) {
      throw new Error(this._failureMessage);
    }

    return {
      success: true,
      queued: true,
      emailData,
    };
  },

  // Métodos de utilidad para testing
  reset() {
    this._calls = [];
    this._shouldFail = false;
    this._failureMessage = "Mock email service failure";
  },

  getCalls() {
    return [...this._calls];
  },

  getCallsForMethod(method) {
    return this._calls.filter((call) => call.method === method);
  },

  getCallCount() {
    return this._calls.length;
  },

  getCallCountForMethod(method) {
    return this._calls.filter((call) => call.method === method).length;
  },

  wasCalledWith(method, email) {
    return this._calls.some(
      (call) => call.method === method && call.email === email
    );
  },

  setFailure(shouldFail = true, message = "Mock email service failure") {
    this._shouldFail = shouldFail;
    this._failureMessage = message;
  },

  // Simular diferentes tipos de errores
  simulateNetworkError() {
    this.setFailure(true, "Network error: Unable to connect to email server");
  },

  simulateAuthError() {
    this.setFailure(true, "Authentication failed: Invalid credentials");
  },

  simulateRateLimitError() {
    this.setFailure(true, "Rate limit exceeded: Too many emails sent");
  },

  simulateInvalidEmailError() {
    this.setFailure(true, "Invalid email address format");
  },

  // Simular respuestas exitosas pero con advertencias
  simulatePartialSuccess() {
    this._shouldFail = false;
    this._partialSuccess = true;
  },
};

// Factory function para crear nuevas instancias del mock
const createEmailServiceMock = () => {
  return Object.create(emailServiceMock);
};

// Mock para getEmailService function
const getEmailServiceMock = jest.fn().mockResolvedValue(emailServiceMock);

module.exports = {
  emailServiceMock,
  createEmailServiceMock,
  getEmailServiceMock,
};
