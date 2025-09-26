# 📧 Sistema de Email - Documentación Completa

## 🚀 Características

- ✅ **Múltiples Proveedores**: Gmail, SendGrid, SMTP genérico
- ✅ **Templates HTML**: Plantillas prediseñadas y personalizables
- ✅ **Sistema de Colas**: Envíos masivos con control de concurrencia
- ✅ **Reintentos Automáticos**: Manejo inteligente de fallos
- ✅ **Rate Limiting**: Control de límites de envío
- ✅ **Logging Completo**: Registro detallado de actividad
- ✅ **Modo Desarrollo**: Simulación de envíos para testing
- ✅ **API REST**: Endpoints completos para integración

## 📁 Estructura

```
├── config/
│   └── emailConfig.js          # Configuración del sistema
├── services/
│   └── emailService.js         # Servicio principal
├── controllers/
│   └── emailController.js      # Controlador REST
├── routes/
│   └── emailRoutes.js          # Rutas de la API
└── templates/
    ├── base.html               # Template base
    ├── welcome.html            # Email de bienvenida
    ├── password-reset.html     # Recuperación de contraseña
    ├── notification.html       # Notificaciones generales
    └── email-verification.html # Verificación de email
```

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` basado en `ENV_EXAMPLE.md`:

**Para Gmail (Desarrollo):**

```env
EMAIL_PROVIDER=gmail
EMAIL_FROM=tu-email@gmail.com
EMAIL_FROM_NAME=Tu App
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-app-password
```

**Para SendGrid (Producción):**

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@tudominio.com
EMAIL_FROM_NAME=Tu App
SENDGRID_API_KEY=SG.tu-api-key
```

### 3. Iniciar el Servidor

```bash
npm run dev
```

## 📡 API Endpoints

### Información del Sistema

- `GET /api/emails/stats` - Estadísticas del servicio
- `GET /api/emails/config` - Configuración actual
- `GET /api/emails/templates` - Templates disponibles

### Emails Predefinidos

- `POST /api/emails/welcome` - Email de bienvenida
- `POST /api/emails/password-reset` - Recuperación de contraseña
- `POST /api/emails/verification` - Verificación de email
- `POST /api/emails/notification` - Notificaciones generales

### Utilidades

- `POST /api/emails/custom` - Email personalizado
- `POST /api/emails/test` - Probar configuración

## 🎯 Ejemplos de Uso

### 1. Email de Bienvenida

```javascript
POST /api/emails/welcome
{
  "userEmail": "usuario@example.com",
  "userData": {
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 2. Recuperación de Contraseña

```javascript
POST /api/emails/password-reset
{
  "userEmail": "usuario@example.com",
  "resetData": {
    "name": "Juan Pérez",
    "token": "reset-token-123",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 3. Notificación Personalizada

```javascript
POST /api/emails/notification
{
  "userEmail": "usuario@example.com",
  "notificationData": {
    "userName": "Juan Pérez",
    "title": "Perfil Actualizado",
    "message": "Tu perfil ha sido actualizado exitosamente.",
    "type": "success",
    "isSuccess": true,
    "successTitle": "¡Éxito!",
    "successMessage": "Todos los cambios se guardaron correctamente."
  }
}
```

### 4. Email Personalizado

```javascript
POST /api/emails/custom
{
  "to": "usuario@example.com",
  "subject": "Asunto Personalizado",
  "template": "notification",
  "data": {
    "userName": "Juan",
    "notificationTitle": "Título Custom",
    "notificationMessage": "Mensaje personalizado aquí."
  }
}
```

### 5. Probar Configuración

```javascript
POST /api/emails/test
{
  "to": "test@example.com"
}
```

## 🔧 Uso Programático

### Servicio Directo

```javascript
const { getEmailService } = require("./services/emailService");

// Obtener instancia del servicio
const emailService = await getEmailService();

// Enviar email de bienvenida
await emailService.sendWelcomeEmail("user@example.com", {
  name: "Juan Pérez",
  email: "user@example.com",
  id: "user-id-123",
});

// Enviar email personalizado
await emailService.queueEmail({
  to: "user@example.com",
  subject: "Mi asunto",
  template: "notification",
  data: { userName: "Juan", message: "Hola!" },
});
```

### Integración en Controladores

```javascript
const { getEmailService } = require('../services/emailService');

// En tu controlador
static async createUser(req, res) {
  try {
    // Crear usuario...
    const user = await userService.create(userData);

    // Enviar email de bienvenida
    const emailService = await getEmailService();
    await emailService.sendWelcomeEmail(user.email, user);

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 🎨 Templates

### Templates Disponibles

1. **welcome** - Email de bienvenida para nuevos usuarios
2. **password-reset** - Recuperación de contraseña
3. **email-verification** - Verificación de email
4. **notification** - Notificaciones generales
5. **base** - Template base para personalización

### Personalizar Templates

Los templates usan **Handlebars** para el renderizado:

```html
<div class="email-title">¡Hola {{userName}}!</div>
<div class="email-text">{{message}}</div>

{{#if isUrgent}}
<div class="warning">¡Atención requerida!</div>
{{/if}}
```

### Variables Disponibles

- `{{userName}}` - Nombre del usuario
- `{{userEmail}}` - Email del usuario
- `{{companyName}}` - Nombre de la empresa
- `{{companyAddress}}` - Dirección de la empresa
- `{{footerText}}` - Texto del pie de página
- Y muchas más según el template...

## 🔄 Sistema de Colas

### Configuración

```env
EMAIL_QUEUE_ENABLED=true
EMAIL_MAX_CONCURRENT=5
EMAIL_QUEUE_DELAY=1000
EMAIL_BATCH_SIZE=10
```

### Funcionamiento

1. Los emails se agregan a una cola en memoria
2. Se procesan en lotes de tamaño configurable
3. Control de concurrencia para evitar spam
4. Reintentos automáticos en caso de fallo

## 🔄 Sistema de Reintentos

### Configuración

```env
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000
EMAIL_RETRY_BACKOFF=exponential
```

### Estrategias de Backoff

- **linear**: Delay fijo entre reintentos
- **exponential**: Delay creciente (5s, 10s, 20s, 40s...)

## 📊 Rate Limiting

### Configuración

```env
EMAIL_RATE_LIMIT_ENABLED=true
EMAIL_MAX_PER_HOUR=100
EMAIL_MAX_PER_DAY=1000
```

### Funcionamiento

- Control por hora y por día
- Previene spam accidental
- Protege contra límites del proveedor

## 🐛 Modo Desarrollo

### Configuración

```env
NODE_ENV=development
EMAIL_DEV_SAVE_FILE=true
FORCE_EMAIL_SEND=false
```

### Características

- Simula envíos sin email real
- Guarda emails en archivo JSON
- Logs detallados en consola
- Perfecto para testing

## 📝 Logging

### Niveles de Log

- **error**: Solo errores críticos
- **warn**: Advertencias y errores
- **info**: Información general
- **debug**: Información detallada

### Configuración

```env
EMAIL_LOGGING_ENABLED=true
EMAIL_LOG_LEVEL=info
EMAIL_LOG_FILE=logs/email.log
```

## 🔒 Seguridad

### Mejores Prácticas

1. **App Passwords**: Usa contraseñas de aplicación para Gmail
2. **Variables de Entorno**: Nunca hardcodees credenciales
3. **Rate Limiting**: Configura límites apropiados
4. **Validación**: Valida todos los inputs
5. **HTTPS**: Usa conexiones seguras en producción

### Sanitización

- Inputs automáticamente sanitizados
- Protección contra XSS en templates
- Validación de emails y datos

## 📈 Monitoreo

### Estadísticas Disponibles

```javascript
GET /api/emails/stats

{
  "emailsSent": 150,
  "emailsFailed": 3,
  "queueSize": 5,
  "templatesLoaded": 5,
  "rateLimitCounters": {...},
  "provider": "gmail"
}
```

### Métricas Importantes

- Emails enviados vs fallidos
- Tamaño de la cola
- Contadores de rate limit
- Templates cargados

## 🚨 Solución de Problemas

### Errores Comunes

#### "Authentication failed"

- Verifica credenciales en .env
- Para Gmail: usa App Password, no contraseña normal
- Para SendGrid: verifica API key

#### "Rate limit exceeded"

- Ajusta límites en configuración
- Verifica límites del proveedor
- Usa cola para distribuir envíos

#### "Template not found"

- Verifica que el archivo existe en /templates
- Revisa nombre del template (sin .html)
- Comprueba logs de carga de templates

#### "Queue not processing"

- Verifica EMAIL_QUEUE_ENABLED=true
- Revisa logs del procesador
- Comprueba errores en reintentos

### Debugging

```env
EMAIL_LOG_LEVEL=debug
NODE_ENV=development
```

## 🔄 Actualización y Mantenimiento

### Versiones de Dependencias

- **nodemailer**: ^6.9.7
- **handlebars**: ^4.7.8
- **dotenv**: ^16.3.1

### Backup de Templates

Mantén copias de seguridad de templates personalizados antes de actualizar.

### Monitoreo en Producción

- Revisa logs regularmente
- Monitorea estadísticas de envío
- Configura alertas para fallos

## 📚 Recursos Adicionales

### Enlaces Útiles

- [Nodemailer Documentation](https://nodemailer.com/)
- [Handlebars Guide](https://handlebarsjs.com/guide/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid API](https://docs.sendgrid.com/)

### Soporte

Para reportar bugs o solicitar funcionalidades, crea un issue en el repositorio del proyecto.

---

**¡El sistema de email está listo para usar! 🎉**
