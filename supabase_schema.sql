-- ============================================================
-- FOODADMIN: SCRIPT DDL DE CONFIGURACIÓN Y SEGURIDAD SUPABASE
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ============================================================

-- 1. TABLA DE CONFIGURACIONES Y AUTENTICACIÓN DE APP
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- 3. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'General',
    available BOOLEAN DEFAULT TRUE,
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- 4. TABLA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number BIGINT DEFAULT 1,
    customer_id TEXT,
    products JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Efectivo',
    payment_status TEXT DEFAULT 'unpaid',
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- 5. TABLA DE GASTOS
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'General',
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- 6. TABLA DE NOTAS Y TAREAS
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    category TEXT DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#ec4899',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO Y RENDIMIENTO OPTIMIZADO (POSTGRES)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_deleted ON public.customers(deleted);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products(deleted);
CREATE INDEX IF NOT EXISTS idx_orders_deleted ON public.orders(deleted);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON public.expenses(deleted);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON public.notes(deleted);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(is_pinned);

-- ============================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- ============================================================

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para el rol anon de la aplicación
DROP POLICY IF EXISTS "Permitir todo anon en app_settings" ON public.app_settings;
CREATE POLICY "Permitir todo anon en app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon en customers" ON public.customers;
CREATE POLICY "Permitir todo anon en customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon en products" ON public.products;
CREATE POLICY "Permitir todo anon en products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon en orders" ON public.orders;
CREATE POLICY "Permitir todo anon en orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon en expenses" ON public.expenses;
CREATE POLICY "Permitir todo anon en expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon en notes" ON public.notes;
CREATE POLICY "Permitir todo anon en notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);
