# 🤖 Auto Changelog Generator

Un script inteligente que analiza commits de Git y usa IA para generar changelogs profesionales siguiendo el formato Keep a Changelog.

## 🚀 Características

- **Análisis Inteligente**: Usa IA para entender y categorizar cambios automáticamente
- **Formato Estándar**: Genera changelogs siguiendo Keep a Changelog
- **Versionado Semántico**: Determina automáticamente el próximo número de versión
- **Múltiples Proveedores**: Soporte para OpenAI, Anthropic y Google Gemini
- **Filtros Avanzados**: Por fecha, tipo de commit, tags, etc.
- **Vista Previa**: Modo preview para revisar antes de guardar

## 📦 Instalación

```bash
# El script usa módulos nativos de Node.js, no requiere instalación adicional
# Solo asegúrate de tener Node.js 18+ instalado
```

## 🔑 Configuración

### 1. Variables de Entorno

Configura tu API key según el proveedor que uses:

```bash
# Para OpenAI
export OPENAI_API_KEY="tu-api-key-aqui"

# Para Anthropic
export ANTHROPIC_API_KEY="tu-api-key-aqui"

# Para Google Gemini
export GEMINI_API_KEY="tu-api-key-aqui"
```

### 2. Ubicación del Script

El script debe estar en `scripts/generate-changelog.js` relativo a la raíz del proyecto.

## 📖 Uso

### Comandos Básicos

```bash
# Generar changelog desde el último tag
node scripts/generate-changelog.js --since v1.0.0

# Vista previa de cambios desde una fecha
node scripts/generate-changelog.js --from 2024-01-01 --preview

# Generar solo cambios de tipo "feat"
node scripts/generate-changelog.js --type feat

# Usar proveedor específico de IA
node scripts/generate-changelog.js --ai-provider anthropic
```

### Opciones Avanzadas

```bash
# Rango de fechas específico
node scripts/generate-changelog.js --from 2024-01-01 --to 2024-01-31

# Combinar filtros
node scripts/generate-changelog.js --since v1.0.0 --type feat --preview

# Solo cambios de seguridad
node scripts/generate-changelog.js --type security
```

### Parámetros Disponibles

| Parámetro              | Descripción                     | Ejemplo                |
| ---------------------- | ------------------------------- | ---------------------- |
| `--since <tag>`        | Generar desde un tag específico | `--since v1.0.0`       |
| `--from <date>`        | Fecha inicial (YYYY-MM-DD)      | `--from 2024-01-01`    |
| `--to <date>`          | Fecha final (YYYY-MM-DD)        | `--to 2024-01-31`      |
| `--type <type>`        | Filtrar por tipo de commit      | `--type feat`          |
| `--ai-provider <prov>` | Proveedor de IA                 | `--ai-provider openai` |
| `--preview`            | Vista previa sin guardar        | `--preview`            |
| `--help`               | Mostrar ayuda                   | `--help`               |

## 🎯 Tipos de Commit Soportados

El script reconoce automáticamente estos tipos de conventional commits:

- `feat`: Nuevas funcionalidades → Sección **Added**
- `fix`: Corrección de bugs → Sección **Fixed**
- `docs`: Cambios en documentación → Sección **Changed**
- `style`: Cambios de estilo → Sección **Changed**
- `refactor`: Refactorización → Sección **Changed**
- `test`: Cambios en tests → Sección **Changed**
- `chore`: Tareas de mantenimiento → Sección **Changed**
- `security`: Cambios de seguridad → Sección **Security**
- `remove`: Eliminación de funcionalidades → Sección **Removed**
- `deprecate`: Funcionalidades obsoletas → Sección **Deprecated**

## 🤖 Proveedores de IA

### OpenAI (GPT)

```bash
export OPENAI_API_KEY="sk-..."
node scripts/generate-changelog.js --ai-provider openai
```

### Anthropic (Claude)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
node scripts/generate-changelog.js --ai-provider anthropic
```

### Google Gemini

```bash
export GEMINI_API_KEY="..."
node scripts/generate-changelog.js --ai-provider gemini
```

## 📝 Ejemplos de Output

### Changelog Generado

```markdown
## [1.1.0] - 2024-01-15

### Added

- Enhanced user registration flow with automatic welcome emails
- Added support for custom email templates and personalization
- Implemented advanced analytics tracking for email engagement

### Changed

- Refactored email service architecture to support multiple providers
- Improved error handling and logging throughout the application

### Fixed

- Resolved merge conflicts between email template and analytics features
- Fixed email delivery issues under high load conditions

### Security

- Enhanced input validation for email template parameters
- Added rate limiting for email sending operations
```

## 🔧 Integración con CI/CD

### GitHub Actions

```yaml
name: Generate Changelog
on:
  release:
    types: [published]

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Generate Changelog
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node scripts/generate-changelog.js --since ${{ github.event.release.tag_name }}
```

### GitLab CI

```yaml
generate_changelog:
  stage: release
  script:
    - node scripts/generate-changelog.js --since $CI_COMMIT_TAG
  only:
    - tags
```

## 🛠️ Desarrollo y Contribución

### Estructura del Código

```
scripts/
├── generate-changelog.js    # Script principal
└── README.md               # Esta documentación
```

### Agregar Nuevo Proveedor de IA

1. Agregar método `callNuevoProveedor()` en la clase `ChangelogGenerator`
2. Actualizar el switch en `callAIForCategory()`
3. Agregar validación de API key
4. Documentar en este README

### Debugging

```bash
# Ver commits sin procesar
node scripts/generate-changelog.js --preview --verbose

# Solo análisis sintáctico (sin IA)
NODE_ENV=offline node scripts/generate-changelog.js
```

## ⚠️ Consideraciones

- **Costos de IA**: Cada ejecución consume tokens de la API
- **Rate Limits**: Respeta los límites de tu proveedor de IA
- **Conventional Commits**: Funciona mejor con commits siguiendo conventional commits
- **Idioma**: Actualmente optimizado para español, pero funciona con inglés

## 📄 Licencia

Este script es parte del proyecto principal y sigue la misma licencia.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

¿Necesitas ayuda? Revisa los [issues](https://github.com/tu-repo/issues) o abre uno nuevo.
