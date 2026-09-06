-- ============================================================
-- Privacy-Preserving Journey Analytics Tool
-- PostgreSQL Database Schema + Seed Data
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: tenants
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL UNIQUE,
    privacy_budget NUMERIC(10,4) NOT NULL DEFAULT 10.0,
    privacy_budget_used NUMERIC(10,4) NOT NULL DEFAULT 0.0,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'product_manager' CHECK (role IN ('product_manager', 'privacy_admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================================
-- TABLE: workflow_stages
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_stages (
    stage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, stage_order)
);

-- ============================================================
-- TABLE: interaction_events
-- ============================================================
CREATE TABLE IF NOT EXISTS interaction_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    stage_id UUID REFERENCES workflow_stages(stage_id) ON DELETE SET NULL,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('enter', 'complete', 'abandon', 'timeout')),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    anonymized_user_hash VARCHAR(64) NOT NULL,
    session_duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_interaction_events_tenant ON interaction_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_stage ON interaction_events(stage_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_timestamp ON interaction_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_interaction_events_hash ON interaction_events(anonymized_user_hash);

-- ============================================================
-- TABLE: privacy_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS privacy_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    privacy_mode VARCHAR(50) NOT NULL DEFAULT 'differential_privacy' CHECK (privacy_mode IN ('aggregation_only', 'differential_privacy')),
    epsilon_value NUMERIC(6,4) NOT NULL DEFAULT 1.0,
    retention_days INTEGER NOT NULL DEFAULT 90,
    min_cohort_size INTEGER NOT NULL DEFAULT 5,
    noise_mechanism VARCHAR(50) NOT NULL DEFAULT 'laplace' CHECK (noise_mechanism IN ('laplace', 'gaussian')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: experiments
-- ============================================================
CREATE TABLE IF NOT EXISTS experiments (
    experiment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    experiment_name VARCHAR(255) NOT NULL,
    description TEXT,
    baseline_rate NUMERIC(6,4),
    privacy_rate NUMERIC(6,4),
    error_percentage NUMERIC(6,4),
    accuracy_percentage NUMERIC(6,4),
    epsilon_used NUMERIC(6,4),
    total_events INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    abandonment_useful INTEGER CHECK (abandonment_useful BETWEEN 1 AND 5),
    privacy_sufficient INTEGER CHECK (privacy_sufficient BETWEEN 1 AND 5),
    satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
    comments TEXT,
    use_case VARCHAR(255),
    would_recommend BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: privacy_query_log (budget tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS privacy_query_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    query_type VARCHAR(100) NOT NULL,
    epsilon_consumed NUMERIC(6,4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tenant 1: TechFlow SaaS
INSERT INTO tenants (tenant_id, organization_name, privacy_budget, privacy_budget_used, plan)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'TechFlow SaaS',
    50.0,
    12.5,
    'professional'
) ON CONFLICT (organization_name) DO NOTHING;

-- Tenant 2: Streamline Corp
INSERT INTO tenants (tenant_id, organization_name, privacy_budget, privacy_budget_used, plan)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Streamline Corp',
    30.0,
    5.0,
    'starter'
) ON CONFLICT (organization_name) DO NOTHING;

-- Users for Tenant 1 (password: "password123" bcrypt hash)
INSERT INTO users (user_id, tenant_id, name, email, password_hash, role)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'Alice Johnson',
        'alice@techflow.com',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'privacy_admin'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '11111111-1111-1111-1111-111111111111',
        'Bob Smith',
        'bob@techflow.com',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'product_manager'
    )
ON CONFLICT DO NOTHING;

-- Users for Tenant 2
INSERT INTO users (user_id, tenant_id, name, email, password_hash, role)
VALUES
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'Carol Davis',
        'carol@streamline.com',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'privacy_admin'
    )
ON CONFLICT DO NOTHING;

-- Workflow Stages for Tenant 1
INSERT INTO workflow_stages (stage_id, tenant_id, stage_name, stage_order, description)
VALUES
    ('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Signup', 1, 'User creates an account'),
    ('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Profile Setup', 2, 'User fills in profile details'),
    ('s3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Verification', 3, 'Email/phone verification step'),
    ('s4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Payment', 4, 'User enters payment details'),
    ('s5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Completion', 5, 'Onboarding complete')
ON CONFLICT DO NOTHING;

-- Workflow Stages for Tenant 2
INSERT INTO workflow_stages (stage_id, tenant_id, stage_name, stage_order, description)
VALUES
    ('s6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Landing', 1, 'User visits landing page'),
    ('s7777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Registration', 2, 'User registers account'),
    ('s8888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Dashboard Tour', 3, 'Product tour walkthrough'),
    ('s9999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'First Action', 4, 'User performs first key action')
ON CONFLICT DO NOTHING;

-- Privacy Settings for Tenant 1
INSERT INTO privacy_settings (tenant_id, privacy_mode, epsilon_value, retention_days, min_cohort_size, noise_mechanism)
VALUES ('11111111-1111-1111-1111-111111111111', 'differential_privacy', 1.0, 90, 5, 'laplace')
ON CONFLICT (tenant_id) DO NOTHING;

-- Privacy Settings for Tenant 2
INSERT INTO privacy_settings (tenant_id, privacy_mode, epsilon_value, retention_days, min_cohort_size, noise_mechanism)
VALUES ('22222222-2222-2222-2222-222222222222', 'aggregation_only', 2.0, 60, 10, 'laplace')
ON CONFLICT (tenant_id) DO NOTHING;

-- Sample Experiments for Tenant 1
INSERT INTO experiments (tenant_id, experiment_name, description, baseline_rate, privacy_rate, error_percentage, accuracy_percentage, epsilon_used, total_events, status, completed_at)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Q3 Onboarding Funnel Analysis',
        'Compare standard aggregation vs DP for onboarding funnel',
        0.342, 0.331, 3.21, 96.79, 1.0, 5000, 'completed', NOW() - INTERVAL '2 days'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'Payment Stage Drop-off Study',
        'High-epsilon DP analysis of payment abandonment',
        0.58, 0.562, 3.10, 96.90, 2.0, 3200, 'completed', NOW() - INTERVAL '5 days'
    )
ON CONFLICT DO NOTHING;

-- Sample Feedback
INSERT INTO feedback (tenant_id, user_id, abandonment_useful, privacy_sufficient, satisfaction, comments, use_case, would_recommend)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        5, 4, 5,
        'The abandonment detection correctly identified our verification step as the main bottleneck.',
        'Onboarding optimization',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        4, 5, 4,
        'Privacy settings were flexible. Would love more granular budget controls.',
        'Compliance reporting',
        TRUE
    )
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_stages_updated_at
    BEFORE UPDATE ON workflow_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
