# API REST de Gestión de Usuarios y Emails

## 📋 Descripción General

Esta API REST proporciona funcionalidades completas para la gestión de usuarios y envío de emails en un sistema CRUD. Está construida con Node.js, Express.js y utiliza un sistema de almacenamiento en memoria para simplificación.

### 🚀 Características Principales

- **Gestión completa de usuarios**: CRUD completo con validaciones
- **Sistema de email avanzado**: Múltiples proveedores, plantillas, colas
- **Validación robusta**: Middleware de validación y sanitización
- **Documentación completa**: JSDoc en todos los componentes
- **Manejo de errores**: Respuestas estructuradas y códigos HTTP apropiados

### 🛠️ Tecnologías

- **Backend**: Node.js + Express.js
- **Validación**: Middleware personalizado
- **Emails**: Nodemailer con múltiples proveedores
- **Plantillas**: Handlebars
- **Almacenamiento**: En memoria (simulación de base de datos)

## 🌐 Base URL y Autenticación

### Base URL

```
http://localhost:3000/api
```

### Autenticación

**Actualmente no implementada** - La API no requiere autenticación para acceder a los endpoints. En un entorno de producción, se recomienda implementar JWT o API Keys.

### Headers Requeridos

```
Content-Type: application/json
```

---

## 👥 Endpoints de Usuarios

### 📊 Estadísticas de Usuarios

**GET** `/api/users/stats`

Obtiene estadísticas generales del sistema de usuarios incluyendo totales y métricas temporales.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "totalUsers": 25,
    "usersCreatedToday": 3,
    "usersCreatedThisWeek": 8
  }
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/users/stats" \
  -H "Content-Type: application/json"
```

---

### 🔍 Buscar Usuario por Email

**GET** `/api/users/search/email/{email}`

Busca un usuario específico por su dirección de email.

#### Parámetros de Ruta

| Parámetro | Tipo   | Requerido | Descripción                    |
| --------- | ------ | --------- | ------------------------------ |
| `email`   | string | ✅        | Dirección de email del usuario |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuario encontrado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "María González",
    "email": "maria@example.com",
    "createdAt": "2025-09-25T10:30:00.000Z"
  }
}
```

#### Respuesta de Error (404)

```json
{
  "success": false,
  "message": "Usuario no encontrado con ese email"
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/users/search/email/maria@example.com" \
  -H "Content-Type: application/json"
```

---

### ➕ Crear Usuario

**POST** `/api/users`

Crea un nuevo usuario en el sistema con validaciones completas. Envía automáticamente un email de bienvenida.

#### Cuerpo de la Solicitud

| Campo      | Tipo   | Requerido | Validación           | Descripción                 |
| ---------- | ------ | --------- | -------------------- | --------------------------- |
| `name`     | string | ✅        | 2-50 caracteres      | Nombre completo del usuario |
| `email`    | string | ✅        | Formato email válido | Email único del usuario     |
| `password` | string | ✅        | 6-100 caracteres     | Contraseña del usuario      |

#### Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "createdAt": "2025-09-25T10:30:00.000Z"
  }
}
```

#### Respuesta de Error (400)

```json
{
  "success": false,
  "message": "Error al crear usuario",
  "error": "Datos inválidos: El email ya está registrado, La contraseña debe tener al menos 6 caracteres"
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "mi_password_123"
  }'
```

---

### 📋 Listar Todos los Usuarios

**GET** `/api/users`

Obtiene una lista completa de todos los usuarios registrados en el sistema.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "createdAt": "2025-09-25T10:30:00.000Z"
    },
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "María González",
      "email": "maria@example.com",
      "createdAt": "2025-09-25T11:15:00.000Z"
    }
  ],
  "count": 2
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/users" \
  -H "Content-Type: application/json"
```

---

### 🔎 Obtener Usuario por ID

**GET** `/api/users/{id}`

Obtiene los datos de un usuario específico identificado por su ID único.

#### Parámetros de Ruta

| Parámetro | Tipo   | Requerido | Descripción                 |
| --------- | ------ | --------- | --------------------------- |
| `id`      | string | ✅        | ID único del usuario (UUID) |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuario obtenido exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "createdAt": "2025-09-25T10:30:00.000Z"
  }
}
```

#### Respuesta de Error (404)

```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

---

### ✏️ Actualizar Usuario Completo

**PUT** `/api/users/{id}`

Reemplaza completamente los datos de un usuario existente con la información proporcionada.

#### Parámetros de Ruta

| Parámetro | Tipo   | Requerido | Descripción                 |
| --------- | ------ | --------- | --------------------------- |
| `id`      | string | ✅        | ID único del usuario (UUID) |

#### Cuerpo de la Solicitud

| Campo      | Tipo   | Requerido | Validación           | Descripción                 |
| ---------- | ------ | --------- | -------------------- | --------------------------- |
| `name`     | string | ✅        | 2-50 caracteres      | Nombre completo del usuario |
| `email`    | string | ✅        | Formato email válido | Email único del usuario     |
| `password` | string | ✅        | 6-100 caracteres     | Contraseña del usuario      |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Carlos Pérez",
    "email": "juancarlos@example.com",
    "createdAt": "2025-09-25T10:30:00.000Z"
  }
}
```

#### Ejemplo curl

```bash
curl -X PUT "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Carlos Pérez",
    "email": "juancarlos@example.com",
    "password": "nueva_password_123"
  }'
```

---

### 🔄 Actualizar Usuario Parcial

**PATCH** `/api/users/{id}`

Actualiza solo los campos especificados en la solicitud, dejando intactos los demás campos.

#### Parámetros de Ruta

| Parámetro | Tipo   | Requerido | Descripción                 |
| --------- | ------ | --------- | --------------------------- |
| `id`      | string | ✅        | ID único del usuario (UUID) |

#### Cuerpo de la Solicitud

| Campo      | Tipo   | Requerido | Validación           | Descripción                 |
| ---------- | ------ | --------- | -------------------- | --------------------------- |
| `name`     | string | ❌        | 2-50 caracteres      | Nombre completo del usuario |
| `email`    | string | ❌        | Formato email válido | Email único del usuario     |
| `password` | string | ❌        | 6-100 caracteres     | Contraseña del usuario      |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan Carlos",
    "email": "juan@example.com",
    "createdAt": "2025-09-25T10:30:00.000Z"
  }
}
```

#### Ejemplo curl

```bash
curl -X PATCH "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Carlos"
  }'
```

---

### 🗑️ Eliminar Usuario

**DELETE** `/api/users/{id}`

Elimina permanentemente un usuario del sistema.

#### Parámetros de Ruta

| Parámetro | Tipo   | Requerido | Descripción                 |
| --------- | ------ | --------- | --------------------------- |
| `id`      | string | ✅        | ID único del usuario (UUID) |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

#### Respuesta de Error (404)

```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

#### Ejemplo curl

```bash
curl -X DELETE "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

---

## 📧 Endpoints de Emails

### 📊 Estadísticas del Servicio de Email

**GET** `/api/emails/stats`

Obtiene métricas detalladas sobre el rendimiento del servicio de email.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "emailsSent": 150,
    "emailsFailed": 3,
    "queueSize": 5,
    "templatesLoaded": 8,
    "rateLimitCounters": {
      "hourly": {
        "count": 12,
        "resetTime": 1735425600000
      },
      "daily": {
        "count": 45,
        "resetTime": 1735512000000
      }
    },
    "isProcessingQueue": false,
    "provider": "gmail"
  }
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/emails/stats" \
  -H "Content-Type: application/json"
```

---

### ⚙️ Configuración del Servicio de Email

**GET** `/api/emails/config`

Obtiene la configuración actual del servicio de email (sin datos sensibles).

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Configuración obtenida exitosamente",
  "data": {
    "provider": "gmail",
    "from": "sistema@empresa.com",
    "fromName": "Sistema CRUD",
    "queueEnabled": true,
    "rateLimitEnabled": true,
    "developmentMode": false,
    "templatesLoaded": 8
  }
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/emails/config" \
  -H "Content-Type: application/json"
```

---

### 📋 Templates Disponibles

**GET** `/api/emails/templates`

Obtiene la lista de plantillas HTML disponibles para envío de emails.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Templates obtenidos exitosamente",
  "data": {
    "templates": [
      "welcome",
      "password-reset",
      "email-verification",
      "notification",
      "invoice",
      "newsletter",
      "account-update",
      "order-confirmation"
    ],
    "count": 8
  }
}
```

#### Ejemplo curl

```bash
curl -X GET "http://localhost:3000/api/emails/templates" \
  -H "Content-Type: application/json"
```

---

### 🎉 Enviar Email de Bienvenida

**POST** `/api/emails/welcome`

Envía un email de bienvenida personalizado cuando un usuario se registra.

#### Cuerpo de la Solicitud

| Campo                | Tipo   | Requerido | Descripción                                  |
| -------------------- | ------ | --------- | -------------------------------------------- |
| `userEmail`          | string | ✅        | Email del destinatario                       |
| `userData`           | object | ✅        | Datos del usuario para personalizar el email |
| `userData.name`      | string | ✅        | Nombre completo del usuario                  |
| `userData.email`     | string | ✅        | Email del usuario                            |
| `userData.id`        | string | ✅        | ID único del usuario                         |
| `userData.ip`        | string | ❌        | Dirección IP del registro                    |
| `userData.userAgent` | string | ❌        | User-Agent del navegador                     |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Email de bienvenida enviado exitosamente",
  "data": {
    "emailId": "email_1234567890",
    "status": "queued",
    "recipient": "usuario@example.com"
  }
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/emails/welcome" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "nuevo.usuario@example.com",
    "userData": {
      "name": "Nuevo Usuario",
      "email": "nuevo.usuario@example.com",
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }'
```

---

### 🔑 Enviar Email de Recuperación de Contraseña

**POST** `/api/emails/password-reset`

Envía un email con instrucciones para recuperar la contraseña.

#### Cuerpo de la Solicitud

| Campo                 | Tipo   | Requerido | Descripción                              |
| --------------------- | ------ | --------- | ---------------------------------------- |
| `userEmail`           | string | ✅        | Email del destinatario                   |
| `resetData`           | object | ✅        | Datos para el proceso de recuperación    |
| `resetData.name`      | string | ✅        | Nombre del usuario                       |
| `resetData.token`     | string | ✅        | Token único para validar la recuperación |
| `resetData.ip`        | string | ❌        | Dirección IP de la solicitud             |
| `resetData.userAgent` | string | ❌        | User-Agent del navegador                 |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Email de recuperación enviado exitosamente",
  "data": {
    "emailId": "email_1234567891",
    "status": "queued",
    "recipient": "usuario@example.com"
  }
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/emails/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "usuario@example.com",
    "resetData": {
      "name": "Juan Pérez",
      "token": "abc123def456ghi789",
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }'
```

---

### ✅ Enviar Email de Verificación

**POST** `/api/emails/verification`

Envía un email para verificar la dirección de email de un usuario.

#### Cuerpo de la Solicitud

| Campo                    | Tipo   | Requerido | Descripción                           |
| ------------------------ | ------ | --------- | ------------------------------------- |
| `userEmail`              | string | ✅        | Email del destinatario                |
| `verificationData`       | object | ✅        | Datos para el proceso de verificación |
| `verificationData.name`  | string | ✅        | Nombre del usuario a verificar        |
| `verificationData.token` | string | ✅        | Token único para verificación         |
| `verificationData.code`  | string | ✅        | Código numérico alternativo           |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Email de verificación enviado exitosamente",
  "data": {
    "emailId": "email_1234567892",
    "status": "queued",
    "recipient": "usuario@example.com"
  }
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/emails/verification" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "nuevo.usuario@example.com",
    "verificationData": {
      "name": "Nuevo Usuario",
      "token": "verif_abc123def456",
      "code": "123456"
    }
  }'
```

---

### 🔔 Enviar Notificación por Email

**POST** `/api/emails/notification`

Envía una notificación general por email con diferentes tipos (info, success, warning, error).

#### Cuerpo de la Solicitud

| Campo                       | Tipo   | Requerido | Descripción                                 |
| --------------------------- | ------ | --------- | ------------------------------------------- |
| `userEmail`                 | string | ✅        | Email del destinatario                      |
| `notificationData`          | object | ✅        | Datos de la notificación                    |
| `notificationData.userName` | string | ✅        | Nombre del destinatario                     |
| `notificationData.title`    | string | ✅        | Título de la notificación                   |
| `notificationData.message`  | string | ✅        | Contenido del mensaje                       |
| `notificationData.type`     | string | ❌        | Tipo: 'info', 'success', 'warning', 'error' |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Notificación enviada exitosamente",
  "data": {
    "emailId": "email_1234567893",
    "status": "queued",
    "recipient": "usuario@example.com"
  }
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/emails/notification" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "usuario@example.com",
    "notificationData": {
      "userName": "Juan Pérez",
      "title": "Bienvenido al sistema",
      "message": "Tu cuenta ha sido activada exitosamente. Ya puedes comenzar a usar nuestros servicios.",
      "type": "success"
    }
  }'
```

---

### 🎨 Enviar Email Personalizado

**POST** `/api/emails/custom`

Envía un email completamente personalizado con opciones avanzadas.

#### Cuerpo de la Solicitud

| Campo         | Tipo   | Requerido | Descripción                           |
| ------------- | ------ | --------- | ------------------------------------- |
| `to`          | string | ✅        | Email del destinatario                |
| `subject`     | string | ✅        | Asunto del email                      |
| `template`    | string | ❌        | Nombre de la plantilla a usar         |
| `data`        | object | ❌        | Datos para reemplazar en la plantilla |
| `html`        | string | ❌        | Contenido HTML personalizado          |
| `text`        | string | ❌        | Contenido de texto plano              |
| `attachments` | array  | ❌        | Array de archivos adjuntos            |
| `priority`    | string | ❌        | Prioridad: 'high', 'normal', 'low'    |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Email enviado exitosamente",
  "data": {
    "emailId": "email_1234567894",
    "status": "queued",
    "recipient": "cliente@example.com"
  }
}
```

#### Ejemplo curl - Con Plantilla

```bash
curl -X POST "http://localhost:3000/api/emails/custom" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "cliente@example.com",
    "subject": "Factura mensual - Octubre 2025",
    "template": "invoice",
    "data": {
      "customerName": "Empresa XYZ",
      "invoiceNumber": "INV-2025-001",
      "amount": "$1,250.00",
      "dueDate": "2025-11-15"
    },
    "priority": "high"
  }'
```

#### Ejemplo curl - HTML Personalizado

```bash
curl -X POST "http://localhost:3000/api/emails/custom" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "usuario@example.com",
    "subject": "Actualización importante del sistema",
    "html": "<h1>Sistema actualizado</h1><p>Se han realizado mejoras importantes...</p>",
    "text": "Sistema actualizado. Se han realizado mejoras importantes en la plataforma."
  }'
```

---

### 🧪 Probar Configuración de Email

**POST** `/api/emails/test`

Envía un email de prueba para verificar que la configuración esté funcionando correctamente.

#### Cuerpo de la Solicitud

| Campo | Tipo   | Requerido | Descripción                  |
| ----- | ------ | --------- | ---------------------------- |
| `to`  | string | ✅        | Email donde enviar la prueba |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Email de prueba enviado exitosamente",
  "data": {
    "emailId": "email_test_1234567895",
    "status": "queued",
    "recipient": "admin@example.com"
  }
}
```

#### Ejemplo curl

```bash
curl -X POST "http://localhost:3000/api/emails/test" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "admin@empresa.com"
  }'
```

---

## 📊 Esquemas de Datos

### Usuario

| Campo       | Tipo   | Requerido | Validación           | Descripción                                 |
| ----------- | ------ | --------- | -------------------- | ------------------------------------------- |
| `id`        | string | Sistema   | UUID v4              | Identificador único del usuario             |
| `name`      | string | ✅        | 2-50 caracteres      | Nombre completo del usuario                 |
| `email`     | string | ✅        | Formato email válido | Email único del usuario                     |
| `password`  | string | ✅        | 6-100 caracteres     | Contraseña del usuario (hash en producción) |
| `createdAt` | string | Sistema   | ISO 8601             | Fecha de creación del usuario               |

### Respuesta Estándar de Éxito

```json
{
  "success": true,
  "message": "string",
  "data": "object|array"
}
```

### Respuesta Estándar de Error

```json
{
  "success": false,
  "message": "string",
  "error": "string"
}
```

### Estadísticas de Usuarios

```json
{
  "totalUsers": "number",
  "usersCreatedToday": "number",
  "usersCreatedThisWeek": "number"
}
```

### Estadísticas de Email

```json
{
  "emailsSent": "number",
  "emailsFailed": "number",
  "queueSize": "number",
  "templatesLoaded": "number",
  "rateLimitCounters": {
    "hourly": {
      "count": "number",
      "resetTime": "number"
    },
    "daily": {
      "count": "number",
      "resetTime": "number"
    }
  },
  "isProcessingQueue": "boolean",
  "provider": "string"
}
```

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar configuración de email y otros parámetros
```

### 3. Iniciar el servidor

```bash
npm start
# o para desarrollo
npm run dev
```

### 4. Verificar funcionamiento

```bash
# Página de bienvenida
curl http://localhost:3000/

# Documentación básica
curl http://localhost:3000/api/docs

# Crear primer usuario
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Usuario Admin",
    "email": "admin@example.com",
    "password": "admin123456"
  }'
```

---

## 📚 Recursos Adicionales

- **Documentación JSDoc**: Ejecutar `npm run docs` para generar documentación completa
- **Tests**: Ejecutar `npm test` para validar funcionalidad
- **Coverage**: Ejecutar `npm run test:coverage` para reporte de cobertura
- **Linting**: Ejecutar `npm run lint` para verificar código

---

## 🔧 Códigos de Estado HTTP

| Código | Descripción           | Uso                                         |
| ------ | --------------------- | ------------------------------------------- |
| `200`  | OK                    | Operación exitosa (GET, PUT, PATCH, DELETE) |
| `201`  | Created               | Recurso creado exitosamente (POST)          |
| `400`  | Bad Request           | Datos inválidos o faltantes                 |
| `404`  | Not Found             | Recurso no encontrado                       |
| `500`  | Internal Server Error | Error interno del servidor                  |

---

_Documentación generada automáticamente - API CRUD Sistema de Usuarios v1.0.0_
