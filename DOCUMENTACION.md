# Documentación del Sistema: FoodAdmin v1.0 (Cloud & Local)

**FoodAdmin** es una aplicación administrativa profesional diseñada para negocios de comida y repostería. Permite administrar ventas, tomar pedidos, gestionar clientes, controlar catálogo, registrar gastos operativos y organizar notas y tareas al estilo Notion. Opera con arquitectura **Online Cloud** mediante **Supabase (PostgreSQL)** y con soporte **Offline-First (IndexedDB)**.

---

## 🛠️ Ficha Técnica y Herramientas Utilizadas

La aplicación está desarrollada bajo un stack moderno de alto rendimiento visual y técnico:

1. **Vite**: Servidor de desarrollo y empaquetador ultrarrápido para módulos ES nativos.
2. **TypeScript (ESNext)**: Tipado estricto para prevenir errores en tiempo de ejecución y asegurar mantenibilidad.
3. **HTML5 y CSS3 Puro**: Maquetación semántica y diseño visual premium en modo oscuro nativo, efectos glassmorphism (translucidez y desenfoque), micro-animaciones y bordes neón.
4. **Supabase (PostgreSQL 15)**: Base de datos relacional en la nube para almacenamiento y sincronización remota en tiempo real.
5. **IndexedDB (Versión 4)**: Almacenamiento local persistente en el navegador para funcionamiento offline y cache local instantáneo.
6. **Chart.js**: Renderizado interactivo canvas para gráficos financieros y curvas de ventas semanales.
7. **Lucide Icons & SVG**: Iconografía limpia para el panel de navegación.
8. **Day.js / jsPDF / ExcelJS**: Módulos para procesamiento de fechas y exportación de respaldos.
9. **Python (Servidor de Lanzamiento y Sincronización)**: Lanzador portable en un solo clic mediante `server.py` e `Iniciar_FoodAdmin.bat`.

---

## 📐 Arquitectura del Software (Clean Architecture)

El proyecto sigue una arquitectura modular en capas desacopladas con estricta **Separación de Responsabilidades**:

```
src/
├── database/        # Inicialización y migraciones de IndexedDB (db.ts).
├── models/          # Interfaces TypeScript (Product, Customer, Order, Expense, Note).
├── repositories/    # Capa de persistencia CRUD sobre IndexedDB.
├── services/        # Capa de lógica de negocio (ProductService, OrderService, SupabaseService, NoteService, etc.).
├── components/      # Componentes UI (Toast, OrderModal, PinLogin).
├── pages/           # Controladores de vista (Dashboard, ActiveOrders, History, Catalog, Clients, Notes, Backup).
├── utils/           # Ayudantes auxiliares (formatters de moneda y fechas).
├── styles/          # Hoja de estilos principal CSS con sistema de tokens.
└── main.ts          # Punto de entrada de inicialización de la app y ruteo de pestañas.
```

### Patrones de Diseño Aplicados
- **Repository Pattern**: Toda operación de persistencia se abstrae a través de su Repositorio. Las vistas nunca manipulan la base de datos directamente.
- **Service Layer Pattern**: La lógica financiera (cálculo de ganancia neta restando costos de productos y egresos operativos) reside aislada en la capa de servicios.
- **Online Cloud Sync Layer**: `SupabaseService` realiza la conversión bidireccional entre `camelCase` (JS) y `snake_case` (PostgreSQL), incluyendo claves foráneas e índices.

---

## 📖 Módulos y Funcionalidades Detalladas

### 1. Panel de Control (Dashboard)
- **Ganado Hoy:** Suma total de las órdenes completadas en la fecha actual.
- **Ventas del Mes:** Ganancia acumulada de las ventas del mes en curso.
- **Pedidos Activos:** Indicador dinámico de pedidos en cola de preparación.
- **Pendiente de Cobro:** Deuda acumulada por pedidos sin pagar.
- **Gráfico Semanal de Ventas:** Visualización gráfica canvas de los últimos 7 días.
- **Productos Estrella:** Ranking Top 5 de los artículos más vendidos.

### 2. Pedidos Activos
- **Tablero FIFO:** Gestión visual de órdenes pendientes en cocina.
- **Listo ✅:** Completa el pedido y recalcula estadísticas.
- **Cobrar / Deber:** Alterna el estado de cobro en tiempo real.
- **Edición Rápida:** Abre el pedido en el constructor visual.

### 3. Historial de Ventas
- **Buscador Inteligente:** Búsqueda en vivo por cliente o número de pedido.
- **Filtros Avanzados:** Por fecha (Hoy, Esta Semana, Este Mes) y por estado de pago (Pagados / Pendientes).
- **Edición e Inserción:** Control e inspección total de transacciones pasadas.

### 4. Catálogo de Productos
- **Administración de Menú:** Precios de venta, costo de producción y margen de ganancia.
- **Subida de Imágenes:** Soporte para fotografías de platos en formato Base64/URL.
- **Autofoco e Interacción:** Apertura rápida de modal con foco directo en el primer campo de texto.

### 5. Directorio de Clientes
- **Base de Clientes Frecuentes:** Teléfonos, direcciones de entrega y notas de entrega.
- **Vincular a Pedidos:** Selección rápida de cliente al tomar un nuevo pedido.

### 6. Bloc de Notas y Tareas (Estilo Notion)
- **Listas de Tareas Checkable:** Creación de ítems dinámicos con efecto de tachado automático (`~~strikethrough~~`) al marcarlos.
- **Notas Destacadas (Pinned ⭐):** Posibilidad de fijar notas importantes en la parte superior.
- **Categorización y Colores:** Clasificación por categorías (General, Tareas, Ideas, Recetas, Compras) y paleta de colores.
- **Buscador en Tiempo Real:** Filtrado simultáneo por título, texto o ítems de lista.

### 7. Respaldo, Seguridad y Ajustes
- **Seguridad por PIN de 4 dígitos:** Bloqueo de sesión con teclado numérico virtual y físico.
- **Nube (Supabase Cloud Sync):** Sincronización continua de datos e imágenes con servidor remoto PostgreSQL.
- **Sincronización Local WiFi:** Compartir base de datos entre computadoras de la misma red local.
- **Respaldos JSON:** Exportación e importación manual de copias de seguridad.

---

## 🗄️ Esquema de Base de Datos Relacional (Supabase / PostgreSQL)

El siguiente script SQL define las 6 tablas relacionales, claves foráneas, índices de rendimiento y permisos de acceso:

```sql
-- Script de Base de Datos para Supabase (FoodAdmin)
create extension if not exists pgcrypto;

-- 1. Productos
create table if not exists products (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    description text,
    price numeric(12,2) not null default 0 check(price >= 0),
    cost numeric(12,2) not null default 0 check(cost >= 0),
    category text,
    available boolean not null default true,
    image_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted boolean default false,
    deleted_at timestamptz
);

-- 2. Clientes
create table if not exists customers (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    phone text,
    address text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted boolean default false,
    deleted_at timestamptz
);

-- 3. Pedidos (Relación 1:N con Clientes)
create table if not exists orders (
    id text primary key default gen_random_uuid()::text,
    order_number bigint generated always as identity,
    customer_id text references customers(id) on delete set null,
    products jsonb not null default '[]'::jsonb,
    subtotal numeric(12,2) default 0,
    discount numeric(12,2) default 0,
    delivery_fee numeric(12,2) default 0,
    total numeric(12,2) default 0,
    payment_method text,
    payment_status text default 'unpaid' check(payment_status in ('unpaid', 'partial', 'paid')),
    status text default 'pending' check(status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    notes text,
    created_at timestamptz default now(),
    completed_at timestamptz,
    updated_at timestamptz default now(),
    deleted boolean default false,
    deleted_at timestamptz
);

-- 4. Detalle de Pedidos (Relación N:1 con Pedidos y Productos)
create table if not exists order_items (
    id text primary key default gen_random_uuid()::text,
    order_id text not null references orders(id) on delete cascade,
    product_id text references products(id) on delete set null,
    name text not null,
    price numeric(12,2) not null default 0 check(price >= 0),
    quantity integer not null default 1 check(quantity > 0),
    created_at timestamptz default now()
);

-- 5. Gastos Egresos
create table if not exists expenses (
    id text primary key default gen_random_uuid()::text,
    title text not null,
    description text,
    amount numeric(12,2) not null check(amount >= 0),
    category text,
    expense_date date default current_date,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted boolean default false,
    deleted_at timestamptz
);

-- 6. Notas y Tareas (Notion Style)
create table if not exists notes (
    id text primary key default gen_random_uuid()::text,
    title text not null,
    content text,
    type text default 'note' check(type in ('note', 'checklist')),
    checklist jsonb default '[]'::jsonb,
    category text default 'General',
    tags text[] default '{}',
    color text default '#ec4899',
    icon text,
    is_pinned boolean default false,
    is_archived boolean default false,
    is_locked boolean default false,
    reminder_at timestamptz,
    attachments jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted boolean default false,
    deleted_at timestamptz
);

-- Índices de Rendimiento
create index if not exists idx_products_name on products(name);
create index if not exists idx_products_category on products(category);
create index if not exists idx_customers_name on customers(name);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_product on order_items(product_id);
create index if not exists idx_notes_pinned on notes(is_pinned);
create index if not exists idx_notes_tags on notes using gin(tags);

-- Permisos de Conexión Anónima
alter table products disable row level security;
alter table customers disable row level security;
alter table orders disable row level security;
alter table order_items disable row level security;
alter table expenses disable row level security;
alter table notes disable row level security;
```

---

## 💻 Instrucciones de Ejecución

1. Haz doble clic en el archivo **`Iniciar_FoodAdmin.bat`**.
2. La aplicación se ejecutará de inmediato en una ventana de escritorio nativa e independiente.
3. Para conectar a la nube, dirígete a la pestaña **Respaldo y Ajustes > Nube (Supabase Cloud Sync)**, ingresa la URL y la `anon_key` de tu proyecto y presiona **Probar y Conectar**.
