# 📋 Checklist de Revisión de Pull Requests

## 🛡️ Seguridad Crítica

- [ ] **No se exponen secrets/keys/tokens** en el código (API keys, passwords, etc.)
- [ ] **Validación de entrada** implementada para todos los endpoints públicos
- [ ] **Autenticación/Autorización** correctamente implementada donde corresponde
- [ ] **Headers de seguridad** apropiados (CORS, CSP, HSTS, etc.)
- [ ] **SQL/NoSQL injection** prevention (usando prepared statements/ORM)
- [ ] **Rate limiting** implementado en endpoints públicos
- [ ] **Logs** no contienen información sensible (PII, passwords, etc.)
- [ ] **Dependencias** actualizadas y sin vulnerabilidades conocidas (`npm audit`)

## ⚡ Rendimiento

- [ ] **Queries optimizadas** (evitar N+1 queries, usar índices apropiados)
- [ ] **Caché** implementado donde corresponde (Redis, in-memory, etc.)
- [ ] **Paginación** en endpoints que retornan listas grandes
- [ ] **Lazy loading** para recursos pesados cuando sea necesario
- [ ] **Compresión** habilitada (gzip, brotli)
- [ ] **Timeouts** configurados apropiadamente
- [ ] **Memory leaks** verificados (especialmente en streams/buffers)
- [ ] **Bundle size** verificado si aplica (frontend)

## 🧹 Mejores Prácticas de Código

- [ ] **Funciones existen** antes de ser llamadas (verificación de merge conflicts)
- [ ] **Firmas de funciones** compatibles con llamadas existentes
- [ ] **Linting** pasa sin errores (`eslint`, `prettier`)
- [ ] **Tipos** correctos en lenguajes tipados (TypeScript, etc.)
- [ ] **Nombres descriptivos** para variables, funciones y clases
- [ ] **Separación de responsabilidades** (SOLID principles)
- [ ] **DRY principle** aplicado (no hay código duplicado)
- [ ] **Error handling** apropiado con mensajes útiles
- [ ] **Constantes** extraídas para valores mágicos
- [ ] **Imports/exports** limpios y organizados

## 🧪 Testing

- [ ] **Tests unitarios** para lógica de negocio crítica
- [ ] **Tests de integración** para flujos completos
- [ ] **Tests de API** para endpoints modificados/creados
- [ ] **Cobertura de código** mantenida o mejorada (>80% recomendado)
- [ ] **Edge cases** cubiertos (errores, casos límite, etc.)
- [ ] **Mocks/stubs** apropiados para dependencias externas
- [ ] **Tests pasan** en CI/CD
- [ ] **Tests de performance** si aplica cambios críticos
- [ ] **Tests de seguridad** si aplica (OWASP, etc.)

## 📚 Documentación

- [ ] **README** actualizado si hay cambios en setup/uso
- [ ] **API Documentation** actualizada (Swagger/OpenAPI)
- [ ] **Comentarios** en código complejo o no-obvio
- [ ] **CHANGELOG** actualizado con cambios significativos
- [ ] **Commit messages** descriptivos y siguiendo conventional commits
- [ ] **Wiki/Guides** actualizados si aplica
- [ ] **Diagramas** actualizados si hay cambios en arquitectura
- [ ] **Dependencias** documentadas y justificadas

## 🔍 Verificación General

- [ ] **Merge conflicts** resueltos correctamente
- [ ] **Breaking changes** identificados y documentados
- [ ] **Backwards compatibility** mantenida (o justificada)
- [ ] **Database migrations** incluidas si aplica
- [ ] **Environment variables** documentadas
- [ ] **Feature flags** implementados para cambios riesgosos
- [ ] **Rollback plan** considerado
- [ ] **Monitoreo/Alertas** actualizados si aplica

## 🚀 Deployment & DevOps

- [ ] **Docker** images actualizadas si aplica
- [ ] **CI/CD pipelines** pasan
- [ ] **Environment-specific configs** correctas
- [ ] **Health checks** implementados/actualizados
- [ ] **Monitoring** configurado (logs, metrics, traces)
- [ ] **Scalability** considerada para cambios críticos
- [ ] **Backup/Restore** verificado si hay cambios en DB

---

## 📝 Instrucciones para Revisores

### Antes de Aprobar:

1. **Marcar todos los checkboxes relevantes** para este PR
2. **Solicitar cambios** si algún punto crítico no está cumplido
3. **Verificar manualmente** funcionalidades críticas
4. **Considerar impacto** en producción

### Para Aprobación Rápida (Hotfixes/Trivial):

- [ ] Solo cambios menores sin impacto en producción
- [ ] Tests pasan
- [ ] No hay vulnerabilidades de seguridad

### Notas Adicionales:

- **Security**: Si hay dudas sobre seguridad, consultar con equipo de seguridad
- **Performance**: Para cambios críticos, considerar load testing
- **Breaking Changes**: Requieren aprobación adicional del product owner
- **Database**: Cambios en schema requieren backup verification

---

_Template basado en mejores prácticas de desarrollo y revisiones de código comunes._
