# Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

## Configuración General

```env
NODE_ENV=development
PORT=3000
```

## Configuración de Email

### Proveedor de Email

```env
# Opciones: gmail, sendgrid, smtp
EMAIL_PROVIDER=gmail
EMAIL_FROM=tu-email@gmail.com
EMAIL_FROM_NAME=Tu Aplicación
```

### Gmail (Recomendado para desarrollo)

```env
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-app-password-de-16-caracteres
```

**Importante:** Para Gmail necesitas generar una "App Password":

1. Ve a [Google Account Settings](https://myaccount.google.com/apppasswords)
2. Genera una nueva contraseña de aplicación
3. Usa esa contraseña en `GMAIL_APP_PASSWORD`

### SendGrid (Recomendado para producción)

```env
SENDGRID_API_KEY=SG.tu-sendgrid-api-key
SENDGRID_FROM_EMAIL=tu-email@tudominio.com
```

### SMTP Genérico

```env
SMTP_HOST=smtp.tuproveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-usuario
SMTP_PASSWORD=tu-password
```

## Configuración Avanzada

### Reintentos

```env
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000
EMAIL_RETRY_BACKOFF=exponential
```

### Sistema de Colas

```env
EMAIL_QUEUE_ENABLED=true
EMAIL_MAX_CONCURRENT=5
EMAIL_QUEUE_DELAY=1000
EMAIL_BATCH_SIZE=10
```

### Logging

```env
EMAIL_LOGGING_ENABLED=true
EMAIL_LOG_LEVEL=info
EMAIL_LOG_FILE=logs/email.log
```

### Rate Limiting

```env
EMAIL_RATE_LIMIT_ENABLED=false
EMAIL_MAX_PER_HOUR=100
EMAIL_MAX_PER_DAY=1000
```

### Templates

```env
EMAIL_TEMPLATE_BASE_URL=http://localhost:3000
EMAIL_ASSETS_URL=http://localhost:3000/assets
EMAIL_DEFAULT_LANGUAGE=es
```

### Desarrollo

```env
EMAIL_DEV_SAVE_FILE=true
FORCE_EMAIL_SEND=false
```
