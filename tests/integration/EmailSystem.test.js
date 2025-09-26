/**
 * Tests de integración para el sistema completo de email
 * Prueba la interacción entre controlador, servicio y configuración
 */

const request = require('supertest');
const express = require('express');
const EmailController = require('../../controllers/emailController');
const EmailServiceMock = require('../mocks/EmailService.mock');
const {
  EmailServiceMockFactory,
  EmailTestDataGenerator,
  EmailMockAssertions,
  EmailScenarioTester
} = require('../mocks/EmailService.helpers');

// Mock del servicio de email
jest.mock('../../services/emailService', () => ({
  getEmailService: jest.fn()
}));

const { getEmailService } = require('../../services/emailService');

describe('Email System Integration Tests', () => {
  let app;
  let emailServiceMock;

  beforeAll(() => {
    // Configurar aplicación Express para testing
    app = express();
    app.use(express.json());
    
    // Configurar rutas de email
    app.post('/emails/welcome', EmailController.sendWelcomeEmail);
    app.post('/emails/password-reset', EmailController.sendPasswordResetEmail);
    app.post('/emails/verification', EmailController.sendVerificationEmail);
    app.post('/emails/notification', EmailController.sendNotificationEmail);
    app.post('/emails/custom', EmailController.sendCustomEmail);
    app.post('/emails/test', EmailController.testEmail);
    app.get('/emails/stats', EmailController.getEmailStats);
    app.get('/emails/config', EmailController.getEmailConfig);
    app.get('/emails/templates', EmailController.getAvailableTemplates);
  });

  beforeEach(() => {
    emailServiceMock = new EmailServiceMock(EmailServiceMockFactory.createReliable());
    getEmailService.mockResolvedValue(emailServiceMock);
  });

  afterEach(() => {
    emailServiceMock.reset();
    jest.clearAllMocks();
  });

  describe('Flujo completo de envío de emails', () => {
    test('debe manejar flujo completo de registro de usuario', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        id: 'user-123'
      };

      // 1. Enviar email de bienvenida
      const welcomeResponse = await request(app)
        .post('/emails/welcome')
        .send({
          userEmail: userData.email,
          userData: userData
        });

      expect(welcomeResponse.status).toBe(200);
      expect(welcomeResponse.body.success).toBe(true);

      // 2. Enviar email de verificación
      const verificationResponse = await request(app)
        .post('/emails/verification')
        .send({
          userEmail: userData.email,
          verificationData: {
            name: userData.name,
            token: 'verify-token-123',
            code: '123456'
          }
        });

      expect(verificationResponse.status).toBe(200);

      // 3. Verificar que ambos emails se enviaron
      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(2);

      const sentEmails = emailServiceMock.getSentEmails();
      expect(sentEmails).toHaveLength(2);
      expect(sentEmails.some(email => email.subject.includes('Bienvenido'))).toBe(true);
      expect(sentEmails.some(email => email.subject.includes('Verificación'))).toBe(true);
    });

    test('debe manejar flujo de recuperación de contraseña', async () => {
      const userEmail = 'user@example.com';
      
      // 1. Solicitar reset de contraseña
      const resetResponse = await request(app)
        .post('/emails/password-reset')
        .send({
          userEmail: userEmail,
          resetData: {
            name: 'Test User',
            token: 'reset-token-abc123'
          }
        });

      expect(resetResponse.status).toBe(200);

      // 2. Enviar notificación de confirmación
      const notificationResponse = await request(app)
        .post('/emails/notification')
        .send({
          userEmail: userEmail,
          notificationData: {
            userName: 'Test User',
            title: 'Contraseña actualizada',
            message: 'Tu contraseña ha sido actualizada exitosamente',
            type: 'success'
          }
        });

      expect(notificationResponse.status).toBe(200);

      // 3. Verificar secuencia de emails
      EmailMockAssertions.assertStats(emailServiceMock, {
        totalSent: 2,
        totalFailed: 0
      });

      const sentEmails = emailServiceMock.getSentEmails();
      expect(sentEmails[0].subject).toContain('Recuperación');
      expect(sentEmails[1].subject).toContain('Contraseña actualizada');
    });
  });

  describe('Manejo de errores en cascada', () => {
    test('debe manejar fallo del servicio de email graciosamente', async () => {
      emailServiceMock.configure({ shouldFailSend: true });

      const response = await request(app)
        .post('/emails/welcome')
        .send({
          userEmail: 'test@example.com',
          userData: { name: 'Test User', email: 'test@example.com', id: 'test-123' }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();

      // Verificar que el error se registró
      const failedEmails = emailServiceMock.getFailedEmails();
      expect(failedEmails).toHaveLength(1);
    });

    test('debe recuperarse de fallos temporales', async () => {
      // Configurar para fallar inicialmente
      emailServiceMock.configure({ shouldFailSend: true });

      // Primer intento - debe fallar
      const firstResponse = await request(app)
        .post('/emails/test')
        .send({ to: 'test@example.com' });

      expect(firstResponse.status).toBe(500);

      // Reconfigurar para funcionar
      emailServiceMock.configure({ shouldFailSend: false });

      // Segundo intento - debe funcionar
      const secondResponse = await request(app)
        .post('/emails/test')
        .send({ to: 'test@example.com' });

      expect(secondResponse.status).toBe(200);

      // Verificar estadísticas
      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(1);
      expect(stats.totalFailed).toBe(1);
    });
  });

  describe('Rate limiting y throttling', () => {
    test('debe respetar límites de rate limiting', async () => {
      emailServiceMock.configure({ 
        dailyLimit: 3,
        enableRateLimit: true 
      });

      const emailData = {
        to: 'test@example.com',
        subject: 'Rate Limit Test',
        text: 'Testing rate limits'
      };

      const responses = [];

      // Intentar enviar 5 emails (límite es 3)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/emails/custom')
          .send(emailData);
        
        responses.push(response);
      }

      // Los primeros 3 deben ser exitosos
      expect(responses.slice(0, 3).every(r => r.status === 200)).toBe(true);
      
      // Los últimos 2 deben fallar
      expect(responses.slice(3).every(r => r.status === 500)).toBe(true);

      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(3);
      expect(stats.totalFailed).toBe(2);
    });
  });

  describe('Validación de configuración', () => {
    test('debe obtener configuración del sistema', async () => {
      const response = await request(app).get('/emails/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('templatesLoaded');
    });

    test('debe obtener estadísticas actualizadas', async () => {
      // Generar actividad
      await request(app)
        .post('/emails/test')
        .send({ to: 'stats@example.com' });

      const response = await request(app).get('/emails/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalSent).toBe(1);
      expect(response.body.data.provider).toBe('mock');
    });

    test('debe obtener templates disponibles', async () => {
      const response = await request(app).get('/emails/templates');

      expect(response.status).toBe(200);
      expect(response.body.data.templates).toContain('welcome');
      expect(response.body.data.templates).toContain('notification');
      expect(response.body.data.count).toBeGreaterThan(0);
    });
  });

  describe('Escenarios de alta carga', () => {
    test('debe manejar múltiples requests concurrentes', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/emails/custom')
          .send({
            to: `test${i}@example.com`,
            subject: `Concurrent Test ${i}`,
            text: `This is concurrent email ${i}`
          });
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // Todos los requests deben ser exitosos
      expect(responses.every(r => r.status === 200)).toBe(true);

      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(concurrentRequests);
    });

    test('debe manejar carga con servicio lento', async () => {
      emailServiceMock.configure({ sendDelay: 50 });

      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/emails/test')
            .send({ to: `slow${i}@example.com` })
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(duration).toBeGreaterThan(200); // Al menos 50ms * 5 requests concurrentes
    });
  });

  describe('Validación de datos end-to-end', () => {
    test('debe validar datos de entrada en toda la cadena', async () => {
      const invalidRequests = [
        // Email sin destinatario
        {
          endpoint: '/emails/custom',
          data: { subject: 'No recipient', text: 'Missing to field' }
        },
        // Welcome email sin userData
        {
          endpoint: '/emails/welcome',
          data: { userEmail: 'test@example.com' }
        },
        // Custom email sin contenido
        {
          endpoint: '/emails/custom',
          data: { to: 'test@example.com', subject: 'No content' }
        }
      ];

      for (const req of invalidRequests) {
        const response = await request(app)
          .post(req.endpoint)
          .send(req.data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }

      // No debe haberse enviado ningún email
      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(0);
    });

    test('debe sanitizar y procesar datos correctamente', async () => {
      const testData = {
        userEmail: '  test@example.com  ', // Con espacios
        userData: {
          name: 'Test User',
          email: 'test@example.com',
          id: 'user-123',
          metadata: {
            source: 'api',
            special: 'characters: áéíóú ñ €'
          }
        }
      };

      const response = await request(app)
        .post('/emails/welcome')
        .send(testData);

      expect(response.status).toBe(200);

      const sentEmails = emailServiceMock.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      
      // Verificar que los datos se procesaron correctamente
      const sentEmail = sentEmails[0];
      expect(sentEmail.to).toBe(testData.userEmail);
    });
  });

  describe('Monitoreo y observabilidad', () => {
    test('debe proporcionar métricas detalladas', async () => {
      // Generar actividad mixta
      await request(app)
        .post('/emails/welcome')
        .send({
          userEmail: 'metrics@example.com',
          userData: { name: 'Metrics User', email: 'metrics@example.com', id: 'metrics-123' }
        });

      await request(app)
        .post('/emails/test')
        .send({ to: 'test@example.com' });

      // Configurar para que falle el siguiente
      emailServiceMock.configure({ shouldFailSend: true });

      await request(app)
        .post('/emails/custom')
        .send({ to: 'fail@example.com', subject: 'Will fail', text: 'This will fail' });

      const statsResponse = await request(app).get('/emails/stats');

      expect(statsResponse.body.data).toMatchObject({
        totalSent: 2,
        totalFailed: 1,
        emailsSent: 2,
        emailsFailed: 1,
        provider: 'mock'
      });
    });

    test('debe rastrear historial de llamadas', async () => {
      await request(app)
        .post('/emails/welcome')
        .send({
          userEmail: 'history@example.com',
          userData: { name: 'History User', email: 'history@example.com', id: 'history-123' }
        });

      await request(app)
        .post('/emails/notification')
        .send({
          userEmail: 'history@example.com',
          notificationData: {
            userName: 'History User',
            title: 'Test Notification',
            message: 'Testing history tracking'
          }
        });

      // Verificar historial
      expect(emailServiceMock.wasMethodCalled('sendWelcomeEmail')).toBe(true);
      expect(emailServiceMock.wasMethodCalled('sendNotificationEmail')).toBe(true);
      expect(emailServiceMock.getCallCount()).toBeGreaterThan(0);

      const callHistory = emailServiceMock.getCallHistory();
      expect(callHistory.length).toBeGreaterThan(0);
      expect(callHistory.every(call => call.timestamp)).toBe(true);
    });
  });

  describe('Escenarios de recuperación y resilencia', () => {
    test('debe manejar recuperación automática de servicios', async () => {
      const scenarioTester = new EmailScenarioTester(emailServiceMock);
      
      // Simular recuperación de errores
      const recoveryResult = await scenarioTester.simulateErrorRecovery();
      
      expect(recoveryResult.wasRecovered).toBe(true);
      expect(recoveryResult.initialError).toBeDefined();
      expect(recoveryResult.recoveryResult.success).toBe(true);
    });

    test('debe procesar cola de emails correctamente', async () => {
      emailServiceMock.configure({ enableQueue: true });
      
      // Agregar múltiples emails a la cola
      const queuePromises = [];
      for (let i = 0; i < 5; i++) {
        queuePromises.push(
          request(app)
            .post('/emails/custom')
            .send({
              to: `queue${i}@example.com`,
              subject: `Queued Email ${i}`,
              text: `This is queued email ${i}`
            })
        );
      }

      const responses = await Promise.all(queuePromises);
      expect(responses.every(r => r.status === 200)).toBe(true);

      // Procesar la cola
      await emailServiceMock.processQueue();

      const stats = emailServiceMock.getStats();
      expect(stats.totalSent).toBe(5);
      expect(stats.queueSize).toBe(0);
    });
  });

  describe('Casos edge y límites del sistema', () => {
    test('debe manejar payloads grandes', async () => {
      const largeData = {
        to: 'large@example.com',
        subject: 'Large Payload Test',
        html: '<h1>Large Content</h1>' + '<p>Content</p>'.repeat(1000),
        data: {
          largeArray: new Array(100).fill().map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: `Description for item ${i}`.repeat(10)
          }))
        }
      };

      const response = await request(app)
        .post('/emails/custom')
        .send(largeData);

      expect(response.status).toBe(200);
      
      const sentEmails = emailServiceMock.getSentEmails();
      expect(sentEmails).toHaveLength(1);
    });

    test('debe manejar caracteres especiales y encoding', async () => {
      const specialData = {
        userEmail: 'special@example.com',
        userData: {
          name: 'José María Ñoño',
          email: 'josé@dominio-español.com',
          message: 'Mensaje con acentos: áéíóú, ñ, y símbolos: €£¥',
          emoji: '🎉🚀📧✨'
        }
      };

      const response = await request(app)
        .post('/emails/welcome')
        .send(specialData);

      expect(response.status).toBe(200);

      const sentEmails = emailServiceMock.getSentEmails();
      expect(sentEmails[0].to).toBe(specialData.userEmail);
    });

    test('debe manejar timeout y requests lentos', async () => {
      emailServiceMock.configure({ sendDelay: 100 });

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/emails/test')
        .send({ to: 'timeout@example.com' });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThanOrEqual(95); // Permitir algo de variación
    });
  });
});

