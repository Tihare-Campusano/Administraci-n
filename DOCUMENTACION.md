# Documentación del Sistema: FoodAdmin

FoodAdmin es una aplicación de escritorio local diseñada para la administración de ventas de comida, control financiero, gestión de pedidos activos, catálogo de platos e historial. Se ejecuta localmente en la computadora y almacena los datos de forma 100% privada y offline.

---

## 🛠️ Ficha Técnica y Herramientas

La aplicación está desarrollada con tecnología moderna y eficiente para la web y entornos de escritorio locales:

1. **Vite**: Servidor de desarrollo y empaquetador ultrarrápido para módulos ES nativos.
2. **TypeScript (ESNext)**: Proporciona tipado fuerte para mitigar errores en tiempo de ejecución y estructurar el código de manera mantenible.
3. **HTML5 y CSS3 Puro**: Maquetación semántica y diseño visual premium con modo oscuro nativo, efectos glassmorphic y micro-animaciones.
4. **IndexedDB (Conexión Asíncrona)**: Almacenamiento local persistente de base de datos en el navegador del usuario. Soporta gran volumen de registros sin límites de espacio (a diferencia de LocalStorage).
5. **Chart.js**: Renderizado interactivo y estético del gráfico semanal del panel.
6. **Day.js / jsPDF / ExcelJS**: Librerías preparadas para el formato de fechas, descargas en PDF y exportaciones avanzadas de reportes a planillas Excel.
7. **Python (Servidor de Lanzamiento)**: Utilizado para levantar el servidor y abrir el navegador web automáticamente en un solo clic a través del script `server.py`.

---

## 📐 Arquitectura y Estructura del Desarrollo

El código fuente del proyecto está organizado bajo los principios de **Clean Architecture** y **Separación de Responsabilidades** dentro del directorio `src/`:

```
src/
├── database/        # Inicialización de la base de datos IndexedDB.
├── models/          # Interfaces TypeScript que modelan las entidades (Product, Customer, Order, Expense).
├── repositories/    # Capa de persistencia. CRUD directo sobre IndexedDB.
├── services/        # Capa de lógica de negocio (cálculo de totales, utilidades financieras, validaciones).
├── components/      # Componentes UI reutilizables (Toast de alerta, modales de formulario).
├── pages/           # Vistas principales del sistema (Dashboard, Activos, Historial, Catálogo, Clientes).
├── utils/           # Ayudantes auxiliares (formateadores de pesos, fechas e IDs).
├── styles/          # Hoja de estilos principal CSS.
└── main.ts          # Punto de entrada de inicialización de la app y ruteo de pestañas.
```

### Principios de Diseño Aplicados
* **Repository Pattern (Patrón Repositorio)**: Toda operación de base de datos sobre IndexedDB pasa por su repositorio correspondiente. Las vistas no acceden jamás a IndexedDB directamente.
* **Service Layer (Capa de Servicios)**: La lógica matemática financiera (ej. cálculo de ganancias netas descontando egresos y costos de insumos) reside aislada en la capa de servicios.
* **KISS y DRY**: Se evita la repetición de código delegando formateadores y elementos comunes a utilidades compartidas.
* **Límites de Código**: Cumpliendo las directrices, ningún archivo excede las 300 líneas y las funciones son atómicas (menos de 40 líneas).

---

## 📖 Guía del Usuario: Funcionamiento de la App

El sistema se divide en 7 paneles intuitivos:

### 1. Panel de Control (Dashboard)
Muestra un resumen de caja rápido con:
* **Ganado Hoy:** Suma total de las órdenes completadas en la fecha actual.
* **Ventas del Mes:** Ganancia neta (Ventas - Costos de productos - Gastos operativos) calculada en tiempo real.
* **Pedidos Activos:** Contador de pedidos pendientes.
* **Pendiente de Cobro:** Deuda total de pedidos marcados como impagos.
* **Gráfico Semanal:** Curva de ventas diarias de los últimos 7 días con efectos de gradientes.
* **Productos Estrella:** Un ranking top 5 de los productos más vendidos en volumen y dinero recaudado.

### 2. Pedidos Activos
Tablero donde se listan las órdenes pendientes en preparación en orden de llegada (FIFO):
* El botón **Listo ✅** completa el pedido y lo traslada inmediatamente al historial, recalculando las estadísticas del Dashboard con una animación de salida.
* El botón **Cobrar/Deber** cambia el estado de pago del pedido en caliente.
* El botón **Editar** abre la orden en el constructor visual.

### 3. Historial de Ventas
Tabla de auditoría completa de pedidos históricos:
* Controles de búsqueda por nombre de cliente o número de pedido.
* Filtros rápidos por rango de fecha (Hoy, Esta Semana, Este Mes) y estado de pago (Pagado/Pendiente).
* Permite eliminar registros permanentemente o alternar el cobro haciendo clic en la insignia del estado de pago directamente en la tabla.

### 4. Catálogo de Productos
Lista de platos y bebidas registradas:
* Permite definir precios, descripciones y categorías.
* Al agregar productos, quedan disponibles inmediatamente en el constructor de nuevos pedidos.

### 5. Directorio de Clientes
Base de datos de clientes frecuentes:
* Registra nombres, teléfonos y direcciones.
* Agiliza la toma de pedidos, permitiendo la asignación rápida del cliente del listado.

### 6. Respaldo y Ajustes
Sección para el control y mantenimiento de datos:
* **Exportar Datos:** Descarga un archivo JSON de respaldo con la base de datos completa.
* **Importar Datos:** Permite cargar un archivo JSON previamente respaldado para restaurar el sistema.
* **Zona de Peligro:** Formatea completamente la base de datos de IndexedDB limpiando el sistema.

---

## 💻 Instrucciones para Ejecución Local y de Escritorio

Para usar la aplicación de forma local como aplicación de escritorio en tu PC:

1. **Requisitos:** Asegúrate de tener instalado Python en tu computadora (Node.js ya está configurado en el sistema).
2. **Iniciar:** Haz doble clic en el archivo **Iniciar_FoodAdmin.bat** ubicado en la carpeta principal.
3. **Visualización:** Se abrirá una ventana de consola pequeña (que inicia el servidor de compilación) y de inmediato se desplegará la interfaz de la aplicación en una **ventana de escritorio independiente y sin bordes** (Modo App) gracias a Microsoft Edge/Chrome, sintiéndose como un programa nativo de PC.
4. **Cerrar:** Para cerrar el servidor y apagar la aplicación, cierra la ventana de la aplicación y presiona `Ctrl + C` o simplemente cierra la ventana negra de la consola.
