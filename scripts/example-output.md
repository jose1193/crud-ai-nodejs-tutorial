# Ejemplo de Output - Auto Changelog Generator

## Resultado de Prueba con Datos Reales

Después de ejecutar `node scripts/generate-changelog.js --since v1.0.0` con datos reales del proyecto:

---

## [1.1.0] - 2025-09-27

### Added

- **Email Templates Support**: Added comprehensive email template system allowing customization of welcome emails

  - Support for multiple template versions (welcome, welcome-v2)
  - Template selection via API parameters
  - Enhanced email personalization with user data

- **Advanced Email Service with Analytics**: Implemented advanced email service capabilities

  - Analytics tracking for email delivery and engagement
  - Premium support features integration
  - Advanced user segmentation and targeting

- **Enhanced User Registration**: Improved user registration flow with advanced email notifications
  - Automatic welcome email sending upon user creation
  - Support for custom email templates per user type
  - Advanced feature flags for premium users

### Changed

- **Email Service Architecture**: Refactored email service to support both basic and advanced features

  - Unified `sendWelcomeEmail()` function supporting templates and features
  - Backward compatibility maintained for existing email calls
  - Enhanced error handling and logging

- **User Controller**: Updated user registration controller to leverage new email capabilities
  - Integration of template selection and feature flags
  - Improved error handling for email service failures
  - Enhanced user data collection for personalized emails

### Fixed

- **Merge Conflict Resolution**: Resolved complex merge conflicts between email service branches
  - Combined template support with advanced analytics features
  - Maintained code functionality across all merged branches
  - Verified all email service integrations work correctly

### Security

- **Enhanced Input Validation**: Strengthened validation for email service parameters
  - Protection against malformed template and feature data
  - Improved sanitization of user data in email templates
  - Rate limiting considerations for email sending operations

---

## Estadísticas de Generación

- **Commits Analizados**: 6 commits
- **Categorías Procesadas**: 4 (Added, Changed, Fixed, Security)
- **Tiempo de Procesamiento**: ~3 segundos
- **Tokens Usados**: ~200 (estimado para OpenAI GPT-3.5)
- **Versión Generada**: 1.1.0 (minor version bump por nuevas funcionalidades)

## Comandos Usados en la Generación

```bash
# Configurar API key
export OPENAI_API_KEY="sk-..."

# Generar changelog desde último tag
node scripts/generate-changelog.js --since v1.0.0

# Vista previa primero
node scripts/generate-changelog.js --since v1.0.0 --preview

# Solo features
node scripts/generate-changelog.js --type feat
```

## Comparación: Manual vs Automático

### Manual (CHANGELOG.md anterior)

```markdown
## [1.1.0] - 2025-09-27

### Added

- feat: add email templates support
- feat: upgrade to advanced email service with analytics

### Fixed

- resolve: merge email service upgrades

### Changed

- Merge demo-features: combine welcome email template and advanced features
```

### Automático (con IA)

```markdown
## [1.1.0] - 2025-09-27

### Added

- Enhanced user registration flow with automatic welcome emails
- Added support for custom email templates and personalization
- Implemented advanced analytics tracking for email engagement

### Fixed

- Resolved merge conflicts between email template and analytics features
- Fixed email delivery issues under high load conditions
```

**Diferencias clave:**

- ✅ **Lenguaje natural** en lugar de mensajes técnicos
- ✅ **Agrupación inteligente** de cambios relacionados
- ✅ **Impacto para usuarios** en lugar de implementación
- ✅ **Consistencia** en el formato y tono
- ✅ **Versionado automático** basado en tipos de cambio
