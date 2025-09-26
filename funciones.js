// Crear una función que calcule el precio final de un producto
// Debe recibir precio base, descuento en porcentaje e impuestos
// Aplicar primero el descuento, luego sumar impuestos
// Validar que todos los parámetros sean números positivos
// Retornar objeto con {precioFinal, descuentoAplicado, impuestosAplicados, desglose}
// Incluir manejo de errores para datos inválidos

function calcularPrecioFinal(precioBase, descuento, impuestos) {
  if (
    typeof precioBase !== "number" ||
    typeof descuento !== "number" ||
    typeof impuestos !== "number"
  ) {
    throw new Error("Todos los parámetros deben ser números positivos");
  }
  if (precioBase < 0 || descuento < 0 || impuestos < 0) {
    throw new Error("Todos los parámetros deben ser números positivos");
  }
  const descuentoAplicado = precioBase * (descuento / 100);
  const impuestosAplicados = precioBase * (impuestos / 100);
  const precioFinal = precioBase - descuentoAplicado + impuestosAplicados;
  return {
    precioFinal,
    descuentoAplicado,
    impuestosAplicados,
    desglose: { precioBase, descuentoAplicado, impuestosAplicados },
  };
}

// Create a user authentication function with JWT token generation
// Accept email and password as parameters
// Validate email format and password strength (min 8 chars, uppercase, lowercase, number)
// Return success object with token and user data if valid
// Return error object with specific validation messages if invalid
// Include rate limiting considerations and security best practices

function authenticateUser(email, password) {
  if (!email.includes("@")) {
    return { error: "Email inválido" };
  }
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return { error: "Password inválido" };
  }
}

// Pruebas
console.log("=== PRUEBA FUNCIÓN ESPAÑOL ===");
console.log(calcularPrecioFinal(100, 10, 15));

console.log("=== PRUEBA FUNCIÓN INGLÉS ===");
console.log(authenticateUser("test@email.com", "Password123"));
