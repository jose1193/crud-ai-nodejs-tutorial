// ALCANCE LIMITADO: Sistema básico de carrito de compras
//
// SOLO incluir:
// - Agregar productos al carrito (máximo 10 productos)
// - Calcular total con descuentos básicos
// - Validar stock disponible
// - Generar resumen de compra
//
// NO incluir:
// - Procesamiento de pagos
// - Gestión de usuarios
// - Panel administrativo
// - Reportes avanzados
//
// Límites técnicos:
// - Máximo 50 líneas de código
// - Solo funciones puras, sin base de datos
// - Estructura simple de objetos

class CarritoBasico {
  constructor() {
    this.productos = [];
    this.maxProductos = 10;
  }

  agregarProducto(producto, cantidad = 1) {
    if (this.productos.length >= this.maxProductos) {
      throw new Error("Carrito lleno (máximo 10 productos)");
    }
    if (cantidad > producto.stock) {
      throw new Error("Stock insuficiente");
    }

    const existente = this.productos.find((p) => p.id === producto.id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      this.productos.push({ ...producto, cantidad });
    }
  }

  calcularTotal(descuento = 0) {
    const subtotal = this.productos.reduce(
      (total, p) => total + p.precio * p.cantidad,
      0
    );
    const descuentoAplicado = subtotal * (descuento / 100);
    return {
      subtotal,
      descuento: descuentoAplicado,
      total: subtotal - descuentoAplicado,
    };
  }

  generarResumen() {
    const totales = this.calcularTotal();
    return {
      productos: this.productos.map((p) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        subtotal: p.precio * p.cantidad,
      })),
      ...totales,
      cantidadItems: this.productos.length,
    };
  }
}

module.exports = CarritoBasico;
