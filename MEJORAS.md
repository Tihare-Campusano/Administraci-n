# Documento de Propuestas de Mejora y Roadmap Técnico (FoodAdmin v2.1)

---

## 1. Visión General

**FoodAdmin** es un sistema administrativo híbrido (offline-first con sincronización cloud/WiFi opcional) diseñado para la gestión integral de un negocio de repostería. Este documento compila la auditoría arquitectónica y la lista priorizada de **mejoras sugeridas** para fortalecer la experiencia de usuario (UI/UX), la seguridad, el rendimiento y las capacidades del sistema.

---

## 2. Mejoras Prioritarias por Módulo

### A. Módulo de Pedidos Activos y Flujo de Trabajo (FIFO)
- **Generación e Impresión de Tickets (Impresora Térmica / POS)**:
  - Permitir la generación de tickets de comanda en formato de 58mm / 80mm o PDF para impresión rápida o envío por WhatsApp al cliente.
- **Acción "Repetir Pedido" (Quick Repeat)**:
  - Botón en el historial o detalle de cliente para clonar rápidamente un pedido previo con 1 solo clic.
- **Filtros por Estado de Pedido**:
  - Pestañas/Filtros rápidos en *Pedidos Activos*: `Todos`, `Pendientes`, `En Preparación`, `Listos`.
- **Notificaciones Sonoras / Visuales**:
  - Alerta sonora o indicador neón pulsante cuando ingresa un pedido o cuando un pedido supera los 30 minutos sin ser atendido.

### B. Módulo de Clientes
- **Etiquetas y Clasificación de Clientes**:
  - Categorizar clientes (ej: `VIP`, `Frecuente`, `Mayorista`, `Deudor`).
- **Historial Completo y Botón Rápido de Contacto**:
  - Integración de enlace `https://wa.me/TELEFONO` para abrir chat directo de WhatsApp con el cliente para confirmar la entrega o cobro.
- **Estadísticas por Cliente**:
  - Mostrar total gastado, plato favorito y fecha de última compra directamente en la tarjeta del cliente.

### C. Módulo de Catálogo e Inventario
- **Control de Stock e Inventario Mínimo**:
  - Agregar campos `stockActual` y `stockMinimo` a `Product`. Alertar visualmente cuando un producto se esté agotando e inhabilitar automáticamente la venta cuando esté en 0.
- **Variantes y Opciones de Producto**:
  - Soporte para agregados o variantes de tamaño (ej: *Ración de 6 unidades*, *Caja de 12 unidades*, *Salsa extra*).

### D. Módulo de Finanzas y Gastos
- **Desglose de Ganancia Neta Real (Margen por Producto)**:
  - Cálculo automático del margen bruto de utilidad por categoría de producto `(Precio - Costo) / Precio * 100`.
- **Reportes Comparativos Mensuales y Filtros Avanzados**:
  - Comparativa de ingresos/gastos vs el mes anterior en el Dashboard mediante gráficos de barras duales (Chart.js).

### E. Módulo de Notas y Tareas (Samsung Notes)
- **Organización por Colores y Etiquetas**:
  - Filtrado interactivo por colores distintivos en la barra de Samsung Notes.
- **Recordatorios / Fechas Límite**:
  - Opción de asignar fecha de vencimiento (`reminderAt`) a notas o ítems de listas de compras.

---

## 3. Mejoras de Arquitectura y Rendimiento (Offline-First)

### A. Rendimiento e Indexación en IndexedDB
- **Índices Secundarios en IndexedDB (`db.ts`)**:
  - Crear índices para `customerId`, `status`, `paymentStatus` y `createdAt` en la store de pedidos para acelerar consultas y paginaciones con grandes volúmenes de datos (>5,000 pedidos).

### B. Atajos de Teclado Globales (Power User UX)
- `Ctrl + N` / `F2`: Abrir modal de Nuevo Pedido desde cualquier pestaña.
- `Ctrl + K` / `F3`: Foco inmediato en la barra de búsqueda activa.
- `Ctrl + L`: Bloquear aplicación inmediatamente con PIN/Contraseña.

### C. Sistema de Respaldos Automáticos
- **Copia de Seguridad Automática Diaria**:
  - Opción para guardar automáticamente un respaldo JSON comprimido en la carpeta local de la aplicación al cerrar la jornada.
- **Mecanismo de Recuperación de PIN / Contraseña**:
  - Opción de pregunta de seguridad o código de recuperación local cifrado para evitar bloqueos por extravío del PIN.

---

## 4. Matriz de Priorización e Impacto

| # | Mejora | Complejidad | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | Generación de Ticket / Comanda para Impresora o WhatsApp | Media | Alto | 🚀 Alta |
| 2 | Enlace directo a WhatsApp en directorio de clientes (`wa.me`) | Baja | Alto | 🚀 Alta |
| 3 | Atajos de Teclado Globales (`Ctrl+N`, `Ctrl+K`, `Ctrl+L`) | Baja | Medio | 🟢 Media |
| 4 | Control de Stock / Inventario Mínimo en Productos | Media | Alto | 🚀 Alta |
| 5 | Gráfico Comparativo Mensual en Dashboard (Chart.js) | Media | Medio | 🟢 Media |
| 6 | Índices secundarios en IndexedDB (`db.ts`) | Baja | Alto (Largo Plazo) | 🟢 Media |
| 7 | Copia de seguridad automática diaria en JSON | Baja | Medio | 🟡 Deseable |

---

## 5. Próximos Pasos Recomendados

1. Seleccionar las mejoras de **Prioridad Alta** que desees implementar primero.
2. Mantener la arquitectura **offline-first**, garantizando que la UI responda siempre contra IndexedDB y que cualquier sync cloud/WiFi continúe siendo no bloqueante.
