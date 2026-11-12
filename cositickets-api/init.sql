-- =============================================================================
-- COSI-TICKETS: MODELO DE DATOS COMPLETO Y CARGA DE PRUEBA (POSTGRESQL 14+)
-- =============================================================================

BEGIN;

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS (ENUMS)
DROP TYPE IF EXISTS user_role_enum CASCADE;
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'ORGANIZER', 'CUSTOMER');

DROP TYPE IF EXISTS mfa_type_enum CASCADE;
CREATE TYPE mfa_type_enum AS ENUM ('NONE', 'TOTP_AUTHENTICATOR', 'EMAIL_OTP');

DROP TYPE IF EXISTS raffle_status_enum CASCADE;
CREATE TYPE raffle_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

DROP TYPE IF EXISTS ticket_status_enum CASCADE;
CREATE TYPE ticket_status_enum AS ENUM ('AVAILABLE', 'RESERVED', 'PAID');

DROP TYPE IF EXISTS purchase_payment_status_enum CASCADE;
CREATE TYPE purchase_payment_status_enum AS ENUM ('PENDING', 'PARTIAL_PAYMENT', 'PAID', 'UNPAID');

DROP TYPE IF EXISTS audit_action_enum CASCADE;
CREATE TYPE audit_action_enum AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- =============================================================================
-- 3. TABLAS: SEGURIDAD, AUTENTICACIÓN Y ROLES (RBAC)
-- =============================================================================

-- Políticas de seguridad de contraseñas configurables por el Administrador
CREATE TABLE security_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_scope VARCHAR(30) NOT NULL UNIQUE DEFAULT 'GLOBAL',
    min_length INT NOT NULL DEFAULT 12,
    max_length INT NOT NULL DEFAULT 128,
    require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    require_numbers BOOLEAN NOT NULL DEFAULT TRUE,
    require_special_chars BOOLEAN NOT NULL DEFAULT TRUE,
    min_special_chars INT NOT NULL DEFAULT 1,
    password_expiration_days INT NOT NULL DEFAULT 90,
    password_history_limit INT NOT NULL DEFAULT 5,
    max_failed_attempts INT NOT NULL DEFAULT 5,
    lockout_duration_minutes INT NOT NULL DEFAULT 30,
    mfa_required BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos granulares del sistema
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catálogo de roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación N a M: Roles y Permisos
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Tabla principal de Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'CUSTOMER',
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Historial de Contraseñas (para evitar repeticiones según política)
CREATE TABLE user_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uph_user_id ON user_password_history(user_id);

-- Configuración de MFA para Usuarios
CREATE TABLE user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_type mfa_type_enum NOT NULL DEFAULT 'NONE',
    totp_secret VARCHAR(255),
    backup_codes JSONB DEFAULT '[]'::jsonb,
    otp_code_hash VARCHAR(255),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Límites asignados por el Administrador al Organizador
CREATE TABLE organizer_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    max_total_raffles INT NOT NULL DEFAULT 10,
    max_monthly_raffles INT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. TABLAS: RIFAS, DISEÑO Y AGENTE GENERATIVO
-- =============================================================================

CREATE TABLE raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(180) NOT NULL,
    description TEXT,
    prize_name VARCHAR(150) NOT NULL,
    prize_images JSONB DEFAULT '[]'::jsonb,
    number_range_start INT NOT NULL DEFAULT 0,
    number_range_end INT NOT NULL DEFAULT 99,
    numbers_per_ticket INT NOT NULL DEFAULT 1 CHECK (numbers_per_ticket IN (1, 2, 3)),
    ticket_price NUMERIC(12, 2) NOT NULL CHECK (ticket_price >= 0),
    draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status raffle_status_enum NOT NULL DEFAULT 'ACTIVE',
    winning_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_raffles_organizer ON raffles(organizer_id);
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_raffles_draw_date ON raffles(draw_date);

-- Diseños y Banners creados o generados por el Agente de IA
CREATE TABLE raffle_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL UNIQUE REFERENCES raffles(id) ON DELETE CASCADE,
    primary_color VARCHAR(10) DEFAULT '#4F46E5',
    secondary_color VARCHAR(10) DEFAULT '#06B6D4',
    background_image_url TEXT,
    ticket_template_url TEXT,
    ai_prompt_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. TABLAS: BOLETOS, NÚMEROS, COMPRAS Y PAGOS
-- =============================================================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    ticket_code VARCHAR(30) NOT NULL,
    status ticket_status_enum NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_raffle_ticket_code UNIQUE (raffle_id, ticket_code)
);

CREATE INDEX idx_tickets_raffle_status ON tickets(raffle_id, status);

-- Números asignados a cada boleto (1, 2 o 3 números por ticket)
CREATE TABLE ticket_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    number_value VARCHAR(10) NOT NULL,
    CONSTRAINT uq_raffle_number UNIQUE (raffle_id, number_value)
);

CREATE INDEX idx_ticket_numbers_raffle_value ON ticket_numbers(raffle_id, number_value);

-- Registro de compras y clientes vinculados
CREATE TABLE customer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id),
    raffle_id UUID NOT NULL REFERENCES raffles(id),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    payment_status purchase_payment_status_enum NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12, 2) NOT NULL,
    balance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_customer_raffle_ticket UNIQUE (raffle_id, ticket_id)
);

CREATE INDEX idx_purchases_customer ON customer_purchases(customer_id);
CREATE INDEX idx_purchases_raffle_status ON customer_purchases(raffle_id, payment_status);

-- Transacciones y abonos de pago
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES customer_purchases(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) DEFAULT 'TRANSFER',
    reference_number VARCHAR(100),
    proof_file_url TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_purchase ON payment_transactions(purchase_id);

-- =============================================================================
-- 6. AUDITORÍA INMUTABLE
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(60) NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id),
    action audit_action_enum NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================================================
-- 7. CARGA DE DATOS DE PRUEBA (SEEDS)
-- =============================================================================

-- 7.1 Políticas de Seguridad Iniciales
INSERT INTO security_policies (
    id, policy_scope, min_length, max_length, require_uppercase,
    require_lowercase, require_numbers, require_special_chars, min_special_chars,
    password_expiration_days, password_history_limit, max_failed_attempts,
    lockout_duration_minutes, mfa_required
) VALUES (
    '10000000-0000-0000-0000-000000000001', 'GLOBAL', 12, 128, TRUE,
    TRUE, TRUE, TRUE, 1, 90, 5, 5, 30, FALSE
);

-- 7.2 Permisos
INSERT INTO permissions (id, code, name, module, description) VALUES
('20000000-0000-0000-0000-000000000001', 'users:manage_organizers', 'Gestionar Responsables', 'USERS', 'Crear y configurar cuotas de gestores de rifas'),
('20000000-0000-0000-0000-000000000002', 'policies:manage', 'Gestionar Políticas de Seguridad', 'SECURITY', 'Configurar parámetros de contraseñas y MFA'),
('20000000-0000-0000-0000-000000000003', 'audit:view', 'Consultar Auditoría', 'AUDIT', 'Ver histórico y trazabilidad de cambios'),
('20000000-0000-0000-0000-000000000004', 'raffles:create', 'Crear Rifas', 'RAFFLES', 'Crear tableros y boletos de rifas'),
('20000000-0000-0000-0000-000000000005', 'raffles:update_closure', 'Modificar Cierre de Rifa', 'RAFFLES', 'Editar fecha de sorteo con auditoría'),
('20000000-0000-0000-0000-000000000006', 'payments:register', 'Registrar Abonos y Pagos', 'PAYMENTS', 'Registrar transacciones de boletos'),
('20000000-0000-0000-0000-000000000007', 'tickets:view_mine', 'Ver Mis Boletos', 'PORTAL', 'Consultar boletos comprados en el portal');

-- 7.3 Roles
INSERT INTO roles (id, code, name, description) VALUES
('30000000-0000-0000-0000-000000000001', 'ADMIN', 'Administrador General', 'Acceso total y configuración de políticas'),
('30000000-0000-0000-0000-000000000002', 'ORGANIZER', 'Responsable de Rifa', 'Gestor de rifas, tableros, pagos y reportes'),
('30000000-0000-0000-0000-000000000003', 'CUSTOMER', 'Cliente / Comprador', 'Visualización de tablero y consulta en portal');

-- Asignación de Roles y Permisos
INSERT INTO role_permissions (role_id, permission_id) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007');

-- 7.4 Usuarios (1 Admin, 1 Gestor, 3 Clientes)
-- Hash de demostración para contraseña 'Password@2026!'
INSERT INTO users (id, name, email, phone, password_hash, role, is_active) VALUES
('40000000-0000-0000-0000-000000000001', 'Carlos Mendoza (Admin)', 'admin@cositickets.com', '+573001112233', '$argon2id$v=19$m=65536,t=3,p=4$qFq8zYyV6K7Z5n$DEMOHASH_ADMIN_PW2026', 'ADMIN', TRUE),
('40000000-0000-0000-0000-000000000002', 'Mariana Ospina (Gestora)', 'mariana.rifas@cositickets.com', '+573104445566', '$argon2id$v=19$m=65536,t=3,p=4$qFq8zYyV6K7Z5n$DEMOHASH_ORGANIZER_PW2026', 'ORGANIZER', TRUE),
('40000000-0000-0000-0000-000000000003', 'Juan Perez (Cliente 1)', 'juan.perez@gmail.com', '+573159998877', '$argon2id$v=19$m=65536,t=3,p=4$qFq8zYyV6K7Z5n$DEMOHASH_CLIENT1_PW2026', 'CUSTOMER', TRUE),
('40000000-0000-0000-0000-000000000004', 'Luisa Fernandez (Cliente 2)', 'luisa.f@hotmail.com', '+573208887766', '$argon2id$v=19$m=65536,t=3,p=4$qFq8zYyV6K7Z5n$DEMOHASH_CLIENT2_PW2026', 'CUSTOMER', TRUE),
('40000000-0000-0000-0000-000000000005', 'Andres Gomez (Cliente 3)', 'andres.gomez@outlook.com', '+573017776655', '$argon2id$v=19$m=65536,t=3,p=4$qFq8zYyV6K7Z5n$DEMOHASH_CLIENT3_PW2026', 'CUSTOMER', TRUE);

-- Registrar en historial de contraseñas
INSERT INTO user_password_history (user_id, password_hash)
SELECT id, password_hash FROM users;

-- Ajustar límite del Organizador creado
INSERT INTO organizer_limits (organizer_id, max_total_raffles, max_monthly_raffles) VALUES
('40000000-0000-0000-0000-000000000002', 10, 5);

-- 7.5 Tres Rifas de Ejemplo con Diversas Configuraciones
INSERT INTO raffles (
    id, organizer_id, title, description, prize_name, prize_images,
    number_range_start, number_range_end, numbers_per_ticket, ticket_price, draw_date, status
) VALUES 
-- Rifa 1: Portatil Gamer (1 número por boleto, 00 al 99)
(
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'Gran Rifa: Portátil Gamer ASUS ROG Strix G16',
    'Portátil con pantalla 165Hz, Intel Core i9, 32GB RAM, RTX 4070. Sortea con las últimas 2 cifras de la lotería.',
    'Portátil Gamer ASUS ROG Strix G16',
    '["https://storage.googleapis.com/cositickets-media/prizes/asus_rog.jpg"]'::jsonb,
    0, 99, 1, 50000.00, NOW() + INTERVAL '10 days', 'ACTIVE'
),
-- Rifa 2: Moto Yamaha MT-03 (2 números por boleto, 00 al 99)
(
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'Rifa Exclusiva: Moto Yamaha MT-03 2026 0KM',
    'Cada boleto incluye 2 oportunidades de ganar. Incluye SOAT y matrícula.',
    'Moto Yamaha MT-03 Modelo 2026',
    '["https://storage.googleapis.com/cositickets-media/prizes/yamaha_mt03.jpg"]'::jsonb,
    0, 99, 2, 120000.00, NOW() + INTERVAL '25 days', 'ACTIVE'
),
-- Rifa 3: iPhone 16 Pro Max (3 números por boleto, 00 al 99)
(
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000002',
    'Rifa Navideña: iPhone 16 Pro Max 512GB Titano',
    'Totalmente sellado y libre. Juega con 3 combinaciones por cada boleto emitido.',
    'iPhone 16 Pro Max 512GB',
    '["https://storage.googleapis.com/cositickets-media/prizes/iphone16.jpg"]'::jsonb,
    0, 99, 3, 40000.00, NOW() + INTERVAL '45 days', 'ACTIVE'
);

-- Diseños y Prompts de IA asociados a las 3 rifas
INSERT INTO raffle_designs (
    raffle_id, primary_color, secondary_color, background_image_url, ticket_template_url, ai_prompt_used
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '#6366F1', '#EC4899',
    'https://storage.googleapis.com/cositickets-media/backgrounds/cyberpunk_dark.png',
    'https://storage.googleapis.com/cositickets-media/tickets/ticket_template_gamer.png',
    'Arte moderno publicitario para rifar portátil ASUS ROG gamer, estilo cyberpunk tonos neón azul y morado, fondo oscuro de alta tecnología'
),
(
    '50000000-0000-0000-0000-000000000002',
    '#0284C7', '#10B981',
    'https://storage.googleapis.com/cositickets-media/backgrounds/urban_speed.png',
    'https://storage.googleapis.com/cositickets-media/tickets/ticket_template_moto.png',
    'Banner publicitario deportivo de motocicleta urbana sobre asfalto mojado iluminado con farolas, estilo hiperrealista'
),
(
    '50000000-0000-0000-0000-000000000003',
    '#D97706', '#475569',
    'https://storage.googleapis.com/cositickets-media/backgrounds/gold_minimal.png',
    'https://storage.googleapis.com/cositickets-media/tickets/ticket_template_iphone.png',
    'Diseño minimalista elegante color titanio natural y reflejos dorados para sorteo de smartphone premium'
);

-- 7.6 Generación de Boletos y Asignación de Números (00 al 99)

-- Para Rifa 1 (1 número por boleto: 100 boletos del 00 al 99)
INSERT INTO tickets (id, raffle_id, ticket_code, status)
SELECT 
    gen_random_uuid(),
    '50000000-0000-0000-0000-000000000001',
    'T1-' || LPAD(s::text, 2, '0'),
    'AVAILABLE'
FROM generate_series(0, 99) s;

-- Asociar el número al boleto de la Rifa 1
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, SUBSTRING(t.ticket_code FROM 4)
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000001';

-- Para Rifa 2 (2 números por boleto: 50 boletos, ej: T2-00 [00, 50], T2-01 [01, 51] ...)
INSERT INTO tickets (id, raffle_id, ticket_code, status)
SELECT 
    gen_random_uuid(),
    '50000000-0000-0000-0000-000000000002',
    'T2-' || LPAD(s::text, 2, '0'),
    'AVAILABLE'
FROM generate_series(0, 49) s;

-- Número principal (00 al 49)
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, SUBSTRING(t.ticket_code FROM 4)
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000002';

-- Segundo número (50 al 99)
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, LPAD((SUBSTRING(t.ticket_code FROM 4)::int + 50)::text, 2, '0')
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000002';

-- Para Rifa 3 (3 números por boleto: 33 boletos)
INSERT INTO tickets (id, raffle_id, ticket_code, status)
SELECT 
    gen_random_uuid(),
    '50000000-0000-0000-0000-000000000003',
    'T3-' || LPAD(s::text, 2, '0'),
    'AVAILABLE'
FROM generate_series(0, 32) s;

-- Primer número (00 al 32)
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, SUBSTRING(t.ticket_code FROM 4)
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000003';

-- Segundo número (+33)
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, LPAD((SUBSTRING(t.ticket_code FROM 4)::int + 33)::text, 2, '0')
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000003';

-- Tercer número (+66)
INSERT INTO ticket_numbers (ticket_id, raffle_id, number_value)
SELECT t.id, t.raffle_id, LPAD((SUBSTRING(t.ticket_code FROM 4)::int + 66)::text, 2, '0')
FROM tickets t
WHERE t.raffle_id = '50000000-0000-0000-0000-000000000003';

-- 7.7 Carga de Compras de Prueba (Validación de Estados de Pago)

-- Compra 1: Juan Perez compra boleto T1-07 (Rifa 1) - Estado: PAGADO (50.000)
DO $$
DECLARE
    v_ticket_id UUID;
    v_purchase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ticket_id FROM tickets 
    WHERE raffle_id = '50000000-0000-0000-0000-000000000001' AND ticket_code = 'T1-07';

    UPDATE tickets SET status = 'PAID' WHERE id = v_ticket_id;

    INSERT INTO customer_purchases (id, customer_id, raffle_id, ticket_id, payment_status, total_amount, balance_paid)
    VALUES (v_purchase_id, '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', v_ticket_id, 'PAID', 50000.00, 50000.00);

    INSERT INTO payment_transactions (purchase_id, amount, payment_method, reference_number, proof_file_url, recorded_by)
    VALUES (v_purchase_id, 50000.00, 'NEQUI_TRANSFER', 'NEQ-8839210', 'https://storage.googleapis.com/cositickets-media/proofs/pay_01.pdf', '40000000-0000-0000-0000-000000000002');
END $$;

-- Compra 2: Luisa Fernandez compra boleto T1-21 (Rifa 1) - Estado: ABONO PARCIAL (20.000 de 50.000)
DO $$
DECLARE
    v_ticket_id UUID;
    v_purchase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ticket_id FROM tickets 
    WHERE raffle_id = '50000000-0000-0000-0000-000000000001' AND ticket_code = 'T1-21';

    UPDATE tickets SET status = 'RESERVED' WHERE id = v_ticket_id;

    INSERT INTO customer_purchases (id, customer_id, raffle_id, ticket_id, payment_status, total_amount, balance_paid)
    VALUES (v_purchase_id, '40000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', v_ticket_id, 'PARTIAL_PAYMENT', 50000.00, 20000.00);

    INSERT INTO payment_transactions (purchase_id, amount, payment_method, reference_number, proof_file_url, recorded_by)
    VALUES (v_purchase_id, 20000.00, 'BANCOLOMBIA_QR', 'BN-4491028', 'https://storage.googleapis.com/cositickets-media/proofs/pay_02.png', '40000000-0000-0000-0000-000000000002');
END $$;

-- Compra 3: Andres Gomez aparta boleto T1-88 (Rifa 1) - Estado: PENDIENTE (0 pagado)
DO $$
DECLARE
    v_ticket_id UUID;
    v_purchase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ticket_id FROM tickets 
    WHERE raffle_id = '50000000-0000-0000-0000-000000000001' AND ticket_code = 'T1-88';

    UPDATE tickets SET status = 'RESERVED' WHERE id = v_ticket_id;

    INSERT INTO customer_purchases (id, customer_id, raffle_id, ticket_id, payment_status, total_amount, balance_paid)
    VALUES (v_purchase_id, '40000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', v_ticket_id, 'PENDING', 50000.00, 0.00);
END $$;

-- Compra 4: Juan Perez compra boleto T2-15 en Rifa 2 (Moto) - Juega números 15 y 65 - Estado: PAGADO (120.000)
DO $$
DECLARE
    v_ticket_id UUID;
    v_purchase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ticket_id FROM tickets 
    WHERE raffle_id = '50000000-0000-0000-0000-000000000002' AND ticket_code = 'T2-15';

    UPDATE tickets SET status = 'PAID' WHERE id = v_ticket_id;

    INSERT INTO customer_purchases (id, customer_id, raffle_id, ticket_id, payment_status, total_amount, balance_paid)
    VALUES (v_purchase_id, '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', v_ticket_id, 'PAID', 120000.00, 120000.00);

    INSERT INTO payment_transactions (purchase_id, amount, payment_method, reference_number, proof_file_url, recorded_by)
    VALUES (v_purchase_id, 120000.00, 'DAVIPLATA', 'DVP-9910023', 'https://storage.googleapis.com/cositickets-media/proofs/pay_03.pdf', '40000000-0000-0000-0000-000000000002');
END $$;

-- Compra 5: Luisa Fernandez aparta boleto T3-09 en Rifa 3 (iPhone) - Juega números 09, 42 y 75 - Estado: PAGADO (40.000)
DO $$
DECLARE
    v_ticket_id UUID;
    v_purchase_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_ticket_id FROM tickets 
    WHERE raffle_id = '50000000-0000-0000-0000-000000000003' AND ticket_code = 'T3-09';

    UPDATE tickets SET status = 'PAID' WHERE id = v_ticket_id;

    INSERT INTO customer_purchases (id, customer_id, raffle_id, ticket_id, payment_status, total_amount, balance_paid)
    VALUES (v_purchase_id, '40000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', v_ticket_id, 'PAID', 40000.00, 40000.00);

    INSERT INTO payment_transactions (purchase_id, amount, payment_method, reference_number, proof_file_url, recorded_by)
    VALUES (v_purchase_id, 40000.00, 'CASH', 'EFECTIVO-001', NULL, '40000000-0000-0000-0000-000000000002');
END $$;

-- 7.8 Registro de Auditoría Inicial de Prueba
INSERT INTO audit_logs (
    entity_name, entity_id, actor_id, action, old_values, new_values, ip_address, user_agent
) VALUES (
    'raffles',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'UPDATE',
    '{"draw_date": "2026-11-20T19:00:00Z", "note": "Fecha inicial prevista"}'::jsonb,
    '{"draw_date": "2026-11-21T20:00:00Z", "note": "Ajuste por transmisión de lotería en vivo"}'::jsonb,
    '192.168.1.45',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

COMMIT;
