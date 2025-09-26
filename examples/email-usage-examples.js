/**
 * Ejemplos de uso del sistema de email
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar
 * el sistema de email en diferentes escenarios.
 */

const { getEmailService } = require('../services/emailService');

/**
 * Ejemplo 1: Email de bienvenida básico
 */
async function ejemploBienvenida() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.sendWelcomeEmail('usuario@example.com', {
      name: 'Juan Pérez',
      email: 'usuario@example.com',
      id: '123e4567-e89b-12d3-a456-426614174000',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    console.log('✅ Email de bienvenida enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 2: Recuperación de contraseña
 */
async function ejemploRecuperacion() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.sendPasswordResetEmail('usuario@example.com', {
      name: 'Juan Pérez',
      token: 'reset-token-' + Math.random().toString(36).substr(2, 9),
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    console.log('✅ Email de recuperación enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 3: Notificación de actualización de perfil
 */
async function ejemploNotificacionPerfil() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.sendNotificationEmail('usuario@example.com', {
      userName: 'Juan Pérez',
      title: 'Perfil Actualizado',
      message: 'Tu perfil ha sido actualizado exitosamente. Los cambios ya están activos en tu cuenta.',
      type: 'success',
      isSuccess: true,
      successTitle: 'Actualización Exitosa',
      successMessage: 'Todos los datos se guardaron correctamente.',
      hasAction: true,
      actionDescription: 'Puedes revisar tu perfil actualizado haciendo clic en el botón:',
      actionUrl: 'http://localhost:3000/profile',
      actionButtonText: 'Ver Mi Perfil'
    });
    
    console.log('✅ Notificación de perfil enviada:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 4: Notificación urgente de seguridad
 */
async function ejemploNotificacionSeguridad() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.sendNotificationEmail('usuario@example.com', {
      userName: 'Juan Pérez',
      title: 'Alerta de Seguridad',
      message: 'Hemos detectado un intento de acceso desde una nueva ubicación.',
      type: 'warning',
      isUrgent: true,
      urgentMessage: 'Si no fuiste tú, cambia tu contraseña inmediatamente.',
      hasDetails: true,
      details: [
        { label: 'Ubicación', value: 'Madrid, España' },
        { label: 'Dispositivo', value: 'Windows 10 - Chrome' },
        { label: 'IP', value: '192.168.1.100' },
        { label: 'Fecha', value: new Date().toLocaleString('es-ES') }
      ],
      hasAction: true,
      actionDescription: 'Si no reconoces este acceso, cambia tu contraseña ahora:',
      actionUrl: 'http://localhost:3000/change-password',
      actionButtonText: 'Cambiar Contraseña',
      hasSecondaryAction: true,
      secondaryActionUrl: 'http://localhost:3000/security-settings',
      secondaryActionText: 'Revisar Configuración'
    });
    
    console.log('✅ Alerta de seguridad enviada:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 5: Email personalizado con template custom
 */
async function ejemploEmailPersonalizado() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.queueEmail({
      to: 'usuario@example.com',
      subject: 'Promoción Especial - 50% de Descuento',
      template: 'notification',
      data: {
        userName: 'Juan Pérez',
        notificationTitle: '🎉 ¡Oferta Especial!',
        notificationMessage: 'Tenemos una promoción exclusiva solo para ti. Obtén 50% de descuento en todos nuestros servicios premium.',
        type: 'info',
        isInfo: true,
        infoTitle: 'Promoción Limitada',
        infoMessage: 'Esta oferta es válida solo hasta el 31 de diciembre.',
        hasAction: true,
        actionDescription: 'No pierdas esta oportunidad única:',
        actionUrl: 'http://localhost:3000/promocion?code=DESC50',
        actionButtonText: 'Obtener Descuento',
        hasUnsubscribe: true
      },
      priority: 'high'
    });
    
    console.log('✅ Email promocional enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 6: Envío masivo con cola
 */
async function ejemploEnvioMasivo() {
  try {
    const emailService = await getEmailService();
    
    const usuarios = [
      { email: 'usuario1@example.com', name: 'Ana García' },
      { email: 'usuario2@example.com', name: 'Carlos López' },
      { email: 'usuario3@example.com', name: 'María Rodríguez' },
      { email: 'usuario4@example.com', name: 'Pedro Martínez' },
      { email: 'usuario5@example.com', name: 'Laura Fernández' }
    ];
    
    console.log(`📧 Enviando newsletter a ${usuarios.length} usuarios...`);
    
    const promises = usuarios.map(usuario => 
      emailService.queueEmail({
        to: usuario.email,
        subject: 'Newsletter Mensual - Novedades',
        template: 'notification',
        data: {
          userName: usuario.name,
          notificationTitle: 'Newsletter de ' + new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
          notificationMessage: `Hola ${usuario.name}, aquí tienes las novedades más importantes de este mes.`,
          type: 'info',
          isInfo: true,
          infoTitle: 'Nuevas Funcionalidades',
          infoMessage: 'Hemos agregado nuevas características que te van a encantar.',
          hasAction: true,
          actionUrl: 'http://localhost:3000/novedades',
          actionButtonText: 'Ver Novedades',
          hasUnsubscribe: true
        }
      })
    );
    
    const results = await Promise.allSettled(promises);
    const exitosos = results.filter(r => r.status === 'fulfilled').length;
    const fallidos = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Envío masivo completado: ${exitosos} exitosos, ${fallidos} fallidos`);
  } catch (error) {
    console.error('❌ Error en envío masivo:', error.message);
  }
}

/**
 * Ejemplo 7: Verificación de email
 */
async function ejemploVerificacion() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.sendVerificationEmail('usuario@example.com', {
      name: 'Juan Pérez',
      token: 'verify-token-' + Math.random().toString(36).substr(2, 9),
      code: Math.random().toString(36).substr(2, 6).toUpperCase()
    });
    
    console.log('✅ Email de verificación enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Ejemplo 8: Obtener estadísticas del servicio
 */
async function ejemploEstadisticas() {
  try {
    const emailService = await getEmailService();
    const stats = emailService.getStats();
    
    console.log('📊 Estadísticas del servicio de email:');
    console.log(`   📤 Emails enviados: ${stats.emailsSent}`);
    console.log(`   ❌ Emails fallidos: ${stats.emailsFailed}`);
    console.log(`   ⏳ Cola actual: ${stats.queueSize} emails`);
    console.log(`   📄 Templates cargados: ${stats.templatesLoaded}`);
    console.log(`   🔧 Proveedor: ${stats.provider}`);
    console.log(`   🔄 Procesando cola: ${stats.isProcessingQueue ? 'Sí' : 'No'}`);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error.message);
  }
}

/**
 * Ejemplo 9: Email con archivo adjunto
 */
async function ejemploConAdjunto() {
  try {
    const emailService = await getEmailService();
    
    const result = await emailService.queueEmail({
      to: 'usuario@example.com',
      subject: 'Reporte Mensual - Adjunto',
      template: 'notification',
      data: {
        userName: 'Juan Pérez',
        notificationTitle: 'Reporte Mensual Disponible',
        notificationMessage: 'Tu reporte mensual está listo. Puedes descargarlo desde el adjunto o acceder online.',
        type: 'info',
        hasAction: true,
        actionUrl: 'http://localhost:3000/reportes',
        actionButtonText: 'Ver Online'
      },
      attachments: [
        {
          filename: 'reporte-mensual.pdf',
          content: 'Contenido del PDF aquí...',
          contentType: 'application/pdf'
        }
      ]
    });
    
    console.log('✅ Email con adjunto enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Función principal para ejecutar ejemplos
 */
async function ejecutarEjemplos() {
  console.log('🚀 Iniciando ejemplos del sistema de email...\n');
  
  // Ejecutar ejemplos uno por uno
  console.log('1️⃣ Ejemplo de bienvenida:');
  await ejemploBienvenida();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n2️⃣ Ejemplo de recuperación:');
  await ejemploRecuperacion();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n3️⃣ Ejemplo de notificación de perfil:');
  await ejemploNotificacionPerfil();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n4️⃣ Ejemplo de alerta de seguridad:');
  await ejemploNotificacionSeguridad();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n5️⃣ Ejemplo de email promocional:');
  await ejemploEmailPersonalizado();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n6️⃣ Ejemplo de verificación:');
  await ejemploVerificacion();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n7️⃣ Estadísticas del servicio:');
  await ejemploEstadisticas();
  
  console.log('\n8️⃣ Ejemplo de envío masivo:');
  await ejemploEnvioMasivo();
  
  console.log('\n✨ ¡Todos los ejemplos completados!');
}

// Exportar funciones para uso individual
module.exports = {
  ejemploBienvenida,
  ejemploRecuperacion,
  ejemploNotificacionPerfil,
  ejemploNotificacionSeguridad,
  ejemploEmailPersonalizado,
  ejemploEnvioMasivo,
  ejemploVerificacion,
  ejemploEstadisticas,
  ejemploConAdjunto,
  ejecutarEjemplos
};

// Si se ejecuta directamente
if (require.main === module) {
  ejecutarEjemplos().catch(console.error);
}
