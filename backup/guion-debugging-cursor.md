# 🎬 GUIÓN: DEBUGGING CON CURSOR AI

**Duración Total: 30 minutos**

---

## ┌─────────────────────────────────────┐

## │ 📍 CAPÍTULO 1/5: INTRODUCCIÓN │

## │ ⏱ 00:00 - 03:00 / 30:00 │

## │ 🎯 Presentar proyecto y objetivos │

## └─────────────────────────────────────┘

### NARRACIÓN:

"¡Hola! Bienvenidos a esta píldora sobre debugging con Cursor AI. Hoy aprenderemos a detectar y corregir errores usando la inteligencia artificial como nuestro asistente de debugging."

### ACCIONES A REALIZAR:

1. **Mostrar estructura del proyecto** (30 segundos)

   - Abrir explorador de archivos
   - Explicar: "Tenemos un proyecto Node.js con errores intencionales"
   - Mostrar archivos: `problematic-payment.js`, `discount-errors.js`, `test-runner.js`

2. **Revisar package.json** (30 segundos)

   - Mostrar scripts disponibles
   - Explicar dependencias (express, winston)

3. **Explicar objetivos del video** (2 minutos)
   - "Vamos a simular errores reales de producción"
   - "Aprenderemos 3 técnicas clave:"
     - Detectar fallos sin logs completos
     - Pedir análisis de errores lógicos a la IA
     - Generar logs útiles automáticamente

---

## ┌─────────────────────────────────────┐

## │ 📍 CAPÍTULO 2/5: DETECCIÓN BUGS │

## │ ⏱ 03:00 - 09:00 / 30:00 │

## │ 🔍 Ejecutar código con errores │

## └─────────────────────────────────────┘

### NARRACIÓN:

"Empezamos ejecutando nuestro código problemático. Como en la vida real, no siempre tenemos logs claros que nos digan exactamente qué está mal."

### ACCIONES A REALIZAR:

1. **Ejecutar test con errores** (1 minuto)

   ```bash
   node test-runner.js
   ```

   - Mostrar output confuso
   - Señalar: "Vemos que algo está mal, pero ¿qué exactamente?"

2. **Primer análisis con Cursor** (2 minutos)

   - Seleccionar el output del error
   - **Prompt a Cursor**: "Este output muestra errores pero no está claro qué está pasando. ¿Puedes analizar qué problemas ves?"
   - Mostrar respuesta de Cursor identificando NaN y valores negativos

3. **Ejecutar sistema de pagos individual** (1.5 minutos)

   ```bash
   node problematic-payment.js
   ```

   - Mostrar resultado: `Amount is NaN: true`
   - **Prompt a Cursor**: "El amount sale NaN, ¿dónde está el problema en este código?"

4. **Análisis del código de pagos** (1.5 minutos)
   - Cursor resalta línea 61: `return amount + amount * taxRate;`
   - Explicar: "La IA identifica que taxRate es undefined"
   - Mostrar línea 117 donde falta taxRate en el objeto de prueba

### TIPS PARA EL VIDEO:

- Pausar para leer las respuestas de Cursor
- Resaltar cómo la IA conecta el síntoma (NaN) con la causa (undefined)

---

## ┌─────────────────────────────────────┐

## │ 📍 CAPÍTULO 3/5: ANÁLISIS LÓGICO │

## │ ⏱ 09:00 - 16:00 / 30:00 │

## │ 🧠 Errores lógicos complejos │

## └─────────────────────────────────────┘

### NARRACIÓN:

"Los errores lógicos son los más difíciles de detectar porque el código funciona, pero hace algo diferente a lo esperado. Aquí es donde Cursor AI brilla."

### ACCIONES A REALIZAR:

1. **Ejecutar sistema de descuentos** (1 minuto)

   ```bash
   node discount-errors.js
   ```

   - Mostrar outputs absurdos: descuentos de $1500, clientes que no pagan nada
   - "El código no crashea, pero los números están completamente mal"

2. **Análisis profundo con Cursor** (2.5 minutos)

   - Seleccionar función `calculateTotal`
   - **Prompt**: "Esta función debería calcular el total considerando cantidades, pero algo está mal. ¿Qué ves?"
   - Cursor identifica: no multiplica por quantity
   - Mostrar línea 40: `total + item.price` (falta `* item.quantity`)

3. **Revisar lógica de descuentos** (2 minutos)

   - Seleccionar `applyCustomerDiscount`
   - **Prompt**: "Un descuento del 15% en $100 debería ser $15, pero da $1500. ¿Cuál es el error?"
   - Cursor explica: multiplica directamente en lugar de usar porcentaje
   - Línea 62: `amount * percentage` debería ser `amount * (percentage / 100)`

4. **Problema de códigos promocionales** (1.5 minutos)
   - Seleccionar `applyPromoCode`
   - **Prompt**: "SAVE10 debería dar 10% de descuento, pero da $10 fijo. ¿Por qué?"
   - Cursor señala línea 54: retorna `promo.value` en lugar de calcular porcentaje

### TIPS PARA EL VIDEO:

- Enfatizar cómo la IA entiende la intención vs la implementación
- Mostrar que puede explicar el "por qué" del error, no solo el "dónde"

---

## ┌─────────────────────────────────────┐

## │ 📍 CAPÍTULO 4/5: GENERACIÓN LOGS │

## │ ⏱ 16:00 - 23:00 / 30:00 │

## │ 📝 Logs inteligentes para debug │

## └─────────────────────────────────────┘

### NARRACIÓN:

"Una vez identificados los problemas, necesitamos logs que nos ayuden a debuggear en producción. Cursor puede generar logs automáticamente."

### ACCIONES A REALIZAR:

1. **Generar logs para sistema de pagos** (2.5 minutos)

   - Seleccionar función `processPayment`
   - **Prompt**: "Necesito agregar logs de debugging que me ayuden a identificar cuándo taxRate es undefined y cuándo se generan IDs duplicados. ¿Puedes agregar logs útiles?"
   - Mostrar cómo Cursor agrega:
     ```javascript
     console.log("DEBUG: Processing payment", {
       amount: paymentData.amount,
       taxRate: paymentData.taxRate,
       hasTaxRate: paymentData.taxRate !== undefined,
     });
     ```

2. **Logs para validación de datos** (2 minutos)

   - **Prompt**: "Agrega logs que muestren qué validaciones pasan y cuáles fallan"
   - Cursor agrega logs en `validatePaymentData`:
     ```javascript
     console.log("VALIDATION: Checking amount", data.amount);
     console.log("VALIDATION: Email format", data.customerEmail);
     ```

3. **Logs para sistema de descuentos** (2.5 minutos)
   - Seleccionar `calculateDiscount`
   - **Prompt**: "Necesito logs que muestren paso a paso cómo se calculan los descuentos para detectar errores lógicos"
   - Cursor genera logs detallados:
     ```javascript
     console.log("DISCOUNT DEBUG:", {
       originalTotal: totalAmount,
       promoDiscount: promoDiscount,
       customerDiscount: customerDiscount,
       finalAmount: finalAmount,
     });
     ```

### TIPS PARA EL VIDEO:

- Mostrar cómo los logs generados son contextuales y útiles
- Ejecutar el código con los nuevos logs para ver la diferencia

---

## ┌─────────────────────────────────────┐

## │ 📍 CAPÍTULO 5/5: CORRECCIÓN FINAL │

## │ ⏱ 23:00 - 30:00 / 30:00 │

## │ ✅ Implementar soluciones con IA │

## └─────────────────────────────────────┘

### NARRACIÓN:

"Ahora que identificamos y loggeamos los problemas, usemos Cursor para implementar las correcciones de manera inteligente."

### ACCIONES A REALIZAR:

1. **Corregir cálculo de totales** (1.5 minutos)

   - Seleccionar función `calculateTotal` problemática
   - **Prompt**: "Corrige esta función para que considere las cantidades correctamente"
   - Cursor cambia a: `total + (item.price * item.quantity)`
   - Probar inmediatamente

2. **Corregir descuentos porcentuales** (2 minutos)

   - Seleccionar `applyCustomerDiscount` y `applyPromoCode`
   - **Prompt**: "Corrige estos métodos para que los porcentajes se calculen correctamente"
   - Cursor implementa las fórmulas correctas
   - Mostrar antes/después en ejecución

3. **Corregir validación de taxRate** (1.5 minutos)

   - **Prompt**: "En calculateTotal, agrega validación para taxRate undefined con valor por defecto"
   - Cursor agrega: `const rate = taxRate || 0;`

4. **Verificación final** (2 minutos)
   - Ejecutar `node test-runner.js` corregido
   - Mostrar outputs correctos
   - Comparar con outputs iniciales erróneos

### CIERRE Y CONCLUSIONES (1 minuto):

- "Hemos visto cómo Cursor AI puede:"
  - Identificar errores sin logs claros
  - Analizar lógica de negocio compleja
  - Generar logs útiles automáticamente
  - Implementar correcciones precisas
- "La clave es hacer preguntas específicas y dar contexto a la IA"

---

## 🎯 PUNTOS CLAVE PARA RECORDAR:

### PROMPTS EFECTIVOS USADOS:

1. **Para detección**: "¿Qué problemas ves en este output/código?"
2. **Para análisis**: "Debería hacer X pero hace Y, ¿cuál es el error?"
3. **Para logs**: "Necesito logs que me ayuden a detectar [problema específico]"
4. **Para corrección**: "Corrige [función específica] para que [comportamiento esperado]"

### ERRORES CUBIERTOS:

- ✅ NaN por undefined (taxRate)
- ✅ Errores lógicos de cálculo (descuentos)
- ✅ Validaciones insuficientes
- ✅ IDs duplicados potenciales
- ✅ Logs de información sensible

### TÉCNICAS DEMOSTRADAS:

- ✅ Análisis de síntomas sin logs claros
- ✅ Identificación de errores lógicos complejos
- ✅ Generación automática de logs útiles
- ✅ Corrección guiada por IA
- ✅ Verificación de soluciones

---

## 📋 CHECKLIST PRE-GRABACIÓN:

- [ ] Tener Cursor AI configurado y funcionando
- [ ] Proyecto clonado y dependencias instaladas (`npm install`)
- [ ] Probar que todos los scripts funcionen
- [ ] Tener terminal y editor en pantalla visible
- [ ] Preparar ejemplos de prompts efectivos
- [ ] Revisar timing de cada sección

**¡Listo para grabar un tutorial completo de debugging con Cursor AI!** 🚀
