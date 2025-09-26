<div align="center">

# 🚀 **Sistema CRUD de Usuarios**

[![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/atlas)
[![Jest](https://img.shields.io/badge/Jest-Testing-red.svg)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**API REST completa para gestión de usuarios con arquitectura modular, documentación exhaustiva y preparación para escalabilidad.**

[📖 Documentación API](./API_DOCUMENTATION.md) • [🏗️ Roadmap Arquitectónico](./ARCHITECTURAL_ROADMAP.md)

---

</div>

## 📋 **Descripción del Proyecto**

API REST completa para gestión de usuarios con Node.js/Express.js. Incluye sistema CRUD, email service, validaciones robustas y arquitectura preparada para escalabilidad.

### ✨ **Características**

- ✅ **CRUD completo** de usuarios con validaciones
- ✅ **Sistema de email** con múltiples proveedores
- ✅ **Arquitectura modular** con patrones de diseño
- ✅ **Testing exhaustivo** con Jest
- ✅ **Documentación completa** JSDoc + API docs
- ✅ **Preparado para MongoDB Atlas**

---

## 🛠️ **Tecnologías Utilizadas**

| Categoría         | Tecnologías                   |
| ----------------- | ----------------------------- |
| **Backend**       | Node.js 18+, Express.js 4.18+ |
| **Base de Datos** | MongoDB Atlas                 |
| **Email**         | Nodemailer, Handlebars        |
| **Testing**       | Jest, Supertest               |
| **Utilidades**    | UUID, Winston, CORS           |

---

## 🚀 **Instalación Rápida**

### Prerrequisitos

- Node.js 18+
- MongoDB Atlas account

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/sistema-crud-usuarios.git
cd sistema-crud-usuarios

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales de MongoDB Atlas

# 4. Iniciar aplicación
npm run dev
```

### Verificación

```bash
curl http://localhost:3000/
# Respuesta: {"success": true, "message": "API de Gestión de Usuarios"}
```

---

## 💡 **Uso Rápido**

### Crear Usuario

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "SecurePass123"
  }'
```

### Listar Usuarios

```bash
curl http://localhost:3000/api/users
```

### Enviar Email de Bienvenida

```bash
curl -X POST "http://localhost:3000/api/emails/welcome" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "usuario@example.com",
    "userData": {
      "name": "Usuario",
      "email": "usuario@example.com",
      "id": "user-uuid"
    }
  }'
```

---

## 📁 **Estructura del Proyecto**

```
📦 proyecto-crud/
├── 📂 controllers/     # Lógica HTTP
├── 📂 models/         # Modelos de datos
├── 📂 routes/         # Definición de rutas
├── 📂 services/       # Lógica de negocio
├── 📂 middleware/     # Middleware personalizado
├── 📂 config/         # Configuraciones
├── 📂 templates/      # Templates de email
├── 📂 tests/          # Suite de testing
└── 📂 modules/        # Módulos avanzados
```

---

## 🌐 **API Endpoints**

### 👥 **Usuarios** (`/api/users`)

- `POST /` - Crear usuario
- `GET /` - Listar usuarios
- `GET /:id` - Obtener usuario
- `PUT /:id` - Actualizar usuario completo
- `PATCH /:id` - Actualizar usuario parcial
- `DELETE /:id` - Eliminar usuario
- `GET /stats` - Estadísticas
- `GET /search/email/:email` - Buscar por email

### 📧 **Emails** (`/api/emails`)

- `POST /welcome` - Email de bienvenida
- `POST /password-reset` - Recuperación de contraseña
- `POST /verification` - Verificación de email
- `POST /notification` - Notificaciones
- `POST /custom` - Emails personalizados
- `GET /templates` - Templates disponibles

---

## 🧪 **Testing**

```bash
# Ejecutar todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration
```

---

## 📚 **Documentación**

- 📖 **[Documentación API Completa](./API_DOCUMENTATION.md)** - Todos los endpoints detallados
- 🗺️ **[Roadmap Arquitectónico](./ARCHITECTURAL_ROADMAP.md)** - Plan de evolución
- 🧪 **[Guía de Testing](./tests/README.md)** - Testing y calidad

---

## 🤝 **Contribución**

1. **Fork** el proyecto
2. **Crea** tu rama (`git checkout -b feature/AmazingFeature`)
3. **Commit** cambios (`git commit -m 'Add AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Estándares

- 📝 JSDoc en funciones públicas
- 🧪 Cobertura de tests > 85%
- 🎨 ESLint sin errores
- 📖 Documentación actualizada

---

## 📄 **Licencia**

**MIT License** - Ver [LICENSE](LICENSE) para más detalles.

---

## 🗺️ **Roadmap**

### ✅ **Fase Actual**: Monolito Modular

- Arquitectura limpia implementada
- Patrones de diseño aplicados
- Testing y documentación completos

### 🚀 **Próximas Fases**

1. **Meses 1-2**: Optimización (PostgreSQL, Redis, Docker)
2. **Meses 3-4**: Escalabilidad (Monitoring, Security, Deployments)
3. **Meses 5+**: Microservicios (Condicional)

### 📊 **KPIs de Éxito**

- ⚡ Performance: < 200ms response time
- 🔒 Reliability: > 99.9% uptime
- 📈 Scalability: > 10k req/min

---

<div align="center">

**⭐ Si este proyecto te resulta útil, ¡dale una estrella!**

[📖 API Docs](./API_DOCUMENTATION.md) • [🏗️ Roadmap](./ARCHITECTURAL_ROADMAP.md)

_Desarrollado con ❤️ por ARGENIS_

</div>
