BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 04f50a7431fd

CREATE EXTENSION IF NOT EXISTS citext;

CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE attributes (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    data_type VARCHAR NOT NULL, 
    is_filterable BOOLEAN NOT NULL, 
    sort_order INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE TABLE carriers (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    name_ar VARCHAR NOT NULL, 
    name_en VARCHAR NOT NULL, 
    tracking_url_template VARCHAR, 
    credentials_ref VARCHAR, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE TABLE customers (
    id BIGSERIAL NOT NULL, 
    email CITEXT, 
    phone_e164 VARCHAR, 
    password_hash VARCHAR, 
    first_name VARCHAR, 
    last_name VARCHAR, 
    locale_pref VARCHAR NOT NULL, 
    accepts_marketing BOOLEAN NOT NULL, 
    email_verified_at TIMESTAMP WITH TIME ZONE, 
    phone_verified_at TIMESTAMP WITH TIME ZONE, 
    is_active BOOLEAN NOT NULL, 
    last_login_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (email), 
    UNIQUE (phone_e164)
);

CREATE INDEX ix_customers_is_active ON customers (is_active);

CREATE TABLE locations (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    type VARCHAR NOT NULL, 
    name_ar VARCHAR NOT NULL, 
    name_en VARCHAR NOT NULL, 
    is_sellable_online BOOLEAN NOT NULL, 
    fulfilment_priority SMALLINT NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE INDEX ix_locations_is_active ON locations (is_active);

CREATE INDEX ix_locations_is_sellable_online ON locations (is_sellable_online);

CREATE INDEX ix_locations_type ON locations (type);

CREATE TABLE options (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    input_type VARCHAR NOT NULL, 
    is_filterable BOOLEAN NOT NULL, 
    sort_order INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE TABLE permissions (
    id BIGSERIAL NOT NULL, 
    key VARCHAR NOT NULL, 
    "group" VARCHAR NOT NULL, 
    description VARCHAR, 
    is_dangerous BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (key)
);

CREATE INDEX ix_permissions_group ON permissions ("group");

CREATE TABLE regions (
    id BIGSERIAL NOT NULL, 
    country_code CHAR(2) NOT NULL, 
    code VARCHAR NOT NULL, 
    name_ar VARCHAR NOT NULL, 
    name_en VARCHAR NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE INDEX ix_regions_country_code ON regions (country_code);

CREATE TABLE roles (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    name_ar VARCHAR NOT NULL, 
    name_en VARCHAR NOT NULL, 
    description VARCHAR, 
    is_system BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE TABLE suppliers (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    contact_name VARCHAR, 
    email CITEXT, 
    phone_e164 VARCHAR, 
    address VARCHAR, 
    vat_number VARCHAR, 
    currency CHAR(3) NOT NULL, 
    payment_terms_days SMALLINT, 
    default_lead_time_days SMALLINT, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (code)
);

CREATE INDEX ix_suppliers_is_active ON suppliers (is_active);

CREATE TABLE tax_rates (
    id BIGSERIAL NOT NULL, 
    country_code CHAR(2) NOT NULL, 
    tax_class VARCHAR NOT NULL, 
    rate NUMERIC(5, 4) NOT NULL, 
    is_inclusive BOOLEAN NOT NULL, 
    valid_from DATE NOT NULL, 
    valid_to DATE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_tax_rates_country_code ON tax_rates (country_code);

CREATE INDEX ix_tax_rates_tax_class ON tax_rates (tax_class);

CREATE INDEX ix_tax_rates_valid_from ON tax_rates (valid_from);

CREATE TABLE users (
    id BIGSERIAL NOT NULL, 
    email CITEXT NOT NULL, 
    password_hash VARCHAR NOT NULL, 
    full_name VARCHAR NOT NULL, 
    phone_e164 VARCHAR, 
    mfa_secret VARCHAR, 
    mfa_enabled_at TIMESTAMP WITH TIME ZONE, 
    is_active BOOLEAN NOT NULL, 
    failed_login_count SMALLINT NOT NULL, 
    locked_until TIMESTAMP WITH TIME ZONE, 
    last_login_at TIMESTAMP WITH TIME ZONE, 
    password_changed_at TIMESTAMP WITH TIME ZONE, 
    created_by_user_id BIGINT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    UNIQUE (email)
);

CREATE INDEX ix_users_is_active ON users (is_active);

CREATE TABLE webhook_events (
    id BIGSERIAL NOT NULL, 
    provider VARCHAR NOT NULL, 
    event_id VARCHAR NOT NULL, 
    event_type VARCHAR NOT NULL, 
    payload JSONB NOT NULL, 
    signature_valid BOOLEAN NOT NULL, 
    status VARCHAR NOT NULL, 
    attempts SMALLINT NOT NULL, 
    error VARCHAR, 
    received_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    processed_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (event_id)
);

CREATE INDEX ix_webhook_events_event_type ON webhook_events (event_type);

CREATE INDEX ix_webhook_events_provider ON webhook_events (provider);

CREATE INDEX ix_webhook_events_received_at ON webhook_events (received_at);

CREATE INDEX ix_webhook_events_status ON webhook_events (status);

CREATE TABLE api_keys (
    id BIGSERIAL NOT NULL, 
    name VARCHAR NOT NULL, 
    key_prefix CHAR(8) NOT NULL, 
    key_hash VARCHAR NOT NULL, 
    scopes TEXT[] NOT NULL, 
    created_by_user_id BIGINT NOT NULL, 
    last_used_at TIMESTAMP WITH TIME ZONE, 
    expires_at TIMESTAMP WITH TIME ZONE, 
    revoked_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    UNIQUE (key_hash)
);

CREATE INDEX ix_api_keys_key_prefix ON api_keys (key_prefix);

CREATE TABLE attribute_translations (
    attribute_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    label VARCHAR NOT NULL, 
    PRIMARY KEY (attribute_id, locale), 
    FOREIGN KEY(attribute_id) REFERENCES attributes (id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
    id BIGSERIAL NOT NULL, 
    actor_user_id BIGINT, 
    actor_type VARCHAR NOT NULL, 
    action VARCHAR NOT NULL, 
    entity_type VARCHAR NOT NULL, 
    entity_id BIGINT, 
    before_json JSONB, 
    after_json JSONB, 
    ip INET, 
    user_agent VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(actor_user_id) REFERENCES users (id)
);

CREATE INDEX ix_audit_log_action ON audit_log (action);

CREATE INDEX ix_audit_log_actor_user_id ON audit_log (actor_user_id);

CREATE INDEX ix_audit_log_created_at ON audit_log (created_at);

CREATE INDEX ix_audit_log_entity_id ON audit_log (entity_id);

CREATE INDEX ix_audit_log_entity_type ON audit_log (entity_type);

CREATE TABLE customer_addresses (
    id BIGSERIAL NOT NULL, 
    customer_id BIGINT NOT NULL, 
    label VARCHAR, 
    recipient_name VARCHAR NOT NULL, 
    phone_e164 VARCHAR NOT NULL, 
    line1 VARCHAR NOT NULL, 
    line2 VARCHAR, 
    district VARCHAR, 
    city VARCHAR NOT NULL, 
    region_id BIGINT NOT NULL, 
    postal_code VARCHAR, 
    country_code CHAR(2) NOT NULL, 
    national_short_address CHAR(8), 
    is_default_shipping BOOLEAN NOT NULL, 
    is_default_billing BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE CASCADE, 
    FOREIGN KEY(region_id) REFERENCES regions (id)
);

CREATE INDEX ix_customer_addresses_customer_id ON customer_addresses (customer_id);

CREATE TABLE export_jobs (
    id BIGSERIAL NOT NULL, 
    requested_by_user_id BIGINT NOT NULL, 
    type VARCHAR NOT NULL, 
    params JSONB NOT NULL, 
    status VARCHAR NOT NULL, 
    file_storage_key VARCHAR, 
    row_count INTEGER, 
    error VARCHAR, 
    expires_at TIMESTAMP WITH TIME ZONE, 
    finished_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(requested_by_user_id) REFERENCES users (id)
);

CREATE INDEX ix_export_jobs_requested_by_user_id ON export_jobs (requested_by_user_id);

CREATE INDEX ix_export_jobs_status ON export_jobs (status);

CREATE TABLE import_jobs (
    id BIGSERIAL NOT NULL, 
    requested_by_user_id BIGINT NOT NULL, 
    type VARCHAR NOT NULL, 
    source_storage_key VARCHAR NOT NULL, 
    status VARCHAR NOT NULL, 
    is_dry_run BOOLEAN NOT NULL, 
    total_rows INTEGER, 
    ok_rows INTEGER, 
    error_rows INTEGER, 
    error_report_key VARCHAR, 
    finished_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(requested_by_user_id) REFERENCES users (id)
);

CREATE INDEX ix_import_jobs_requested_by_user_id ON import_jobs (requested_by_user_id);

CREATE INDEX ix_import_jobs_status ON import_jobs (status);

CREATE TABLE media (
    id BIGSERIAL NOT NULL, 
    storage_key VARCHAR NOT NULL, 
    original_filename VARCHAR, 
    mime_type VARCHAR NOT NULL, 
    width_px INTEGER, 
    height_px INTEGER, 
    bytes BIGINT, 
    checksum_sha256 VARCHAR, 
    derivatives JSONB NOT NULL, 
    processing_status VARCHAR NOT NULL, 
    uploaded_by_user_id BIGINT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(uploaded_by_user_id) REFERENCES users (id), 
    UNIQUE (storage_key)
);

CREATE INDEX ix_media_checksum_sha256 ON media (checksum_sha256);

CREATE INDEX ix_media_processing_status ON media (processing_status);

CREATE TABLE notifications (
    id BIGSERIAL NOT NULL, 
    user_id BIGINT NOT NULL, 
    type VARCHAR NOT NULL, 
    title VARCHAR NOT NULL, 
    body VARCHAR, 
    entity_type VARCHAR, 
    entity_id BIGINT, 
    severity VARCHAR NOT NULL, 
    read_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_notifications_read_at ON notifications (read_at);

CREATE INDEX ix_notifications_type ON notifications (type);

CREATE INDEX ix_notifications_user_id ON notifications (user_id);

CREATE TABLE option_translations (
    option_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    label VARCHAR NOT NULL, 
    PRIMARY KEY (option_id, locale), 
    FOREIGN KEY(option_id) REFERENCES options (id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id BIGSERIAL NOT NULL, 
    order_number VARCHAR NOT NULL, 
    customer_id BIGINT, 
    email CITEXT, 
    phone_e164 VARCHAR, 
    status VARCHAR NOT NULL, 
    payment_status VARCHAR NOT NULL, 
    fulfilment_status VARCHAR NOT NULL, 
    currency CHAR(3) NOT NULL, 
    subtotal NUMERIC(12, 2) NOT NULL, 
    discount_total NUMERIC(12, 2) NOT NULL, 
    shipping_total NUMERIC(12, 2) NOT NULL, 
    tax_total NUMERIC(12, 2) NOT NULL, 
    grand_total NUMERIC(12, 2) NOT NULL, 
    coupon_code_snapshot VARCHAR, 
    locale VARCHAR NOT NULL, 
    placed_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    cancelled_at TIMESTAMP WITH TIME ZONE, 
    cancel_reason VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(customer_id) REFERENCES customers (id), 
    UNIQUE (order_number)
);

CREATE INDEX ix_orders_customer_id ON orders (customer_id);

CREATE INDEX ix_orders_email ON orders (email);

CREATE INDEX ix_orders_fulfilment_status ON orders (fulfilment_status);

CREATE INDEX ix_orders_payment_status ON orders (payment_status);

CREATE INDEX ix_orders_placed_at ON orders (placed_at);

CREATE INDEX ix_orders_status ON orders (status);

CREATE TABLE password_resets (
    id BIGSERIAL NOT NULL, 
    user_id BIGINT NOT NULL, 
    token_hash VARCHAR NOT NULL, 
    requested_ip INET, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    consumed_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_password_resets_token_hash ON password_resets (token_hash);

CREATE INDEX ix_password_resets_user_id ON password_resets (user_id);

CREATE TABLE purchase_orders (
    id BIGSERIAL NOT NULL, 
    po_number VARCHAR NOT NULL, 
    supplier_id BIGINT NOT NULL, 
    destination_location_id BIGINT NOT NULL, 
    status VARCHAR NOT NULL, 
    currency CHAR(3) NOT NULL, 
    exchange_rate NUMERIC(12, 6), 
    subtotal NUMERIC(12, 2) NOT NULL, 
    tax_total NUMERIC(12, 2) NOT NULL, 
    shipping_cost NUMERIC(12, 2) NOT NULL, 
    total NUMERIC(12, 2) NOT NULL, 
    expected_at DATE, 
    created_by_user_id BIGINT NOT NULL, 
    approved_by_user_id BIGINT, 
    approved_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(approved_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(destination_location_id) REFERENCES locations (id), 
    FOREIGN KEY(supplier_id) REFERENCES suppliers (id), 
    UNIQUE (po_number)
);

CREATE INDEX ix_purchase_orders_expected_at ON purchase_orders (expected_at);

CREATE INDEX ix_purchase_orders_status ON purchase_orders (status);

CREATE INDEX ix_purchase_orders_supplier_id ON purchase_orders (supplier_id);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL, 
    permission_id BIGINT NOT NULL, 
    granted_by_user_id BIGINT, 
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (role_id, permission_id), 
    FOREIGN KEY(granted_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(permission_id) REFERENCES permissions (id) ON DELETE CASCADE, 
    FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE settings (
    key VARCHAR NOT NULL, 
    value JSONB NOT NULL, 
    "group" VARCHAR NOT NULL, 
    is_public BOOLEAN NOT NULL, 
    updated_by_user_id BIGINT, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (key), 
    FOREIGN KEY(updated_by_user_id) REFERENCES users (id)
);

CREATE INDEX ix_settings_group ON settings ("group");

CREATE TABLE stock_counts (
    id BIGSERIAL NOT NULL, 
    count_number VARCHAR NOT NULL, 
    location_id BIGINT NOT NULL, 
    scope VARCHAR NOT NULL, 
    scope_filter JSONB, 
    status VARCHAR NOT NULL, 
    started_by_user_id BIGINT NOT NULL, 
    approved_by_user_id BIGINT, 
    started_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    applied_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(approved_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(location_id) REFERENCES locations (id), 
    FOREIGN KEY(started_by_user_id) REFERENCES users (id), 
    UNIQUE (count_number)
);

CREATE INDEX ix_stock_counts_location_id ON stock_counts (location_id);

CREATE INDEX ix_stock_counts_status ON stock_counts (status);

CREATE TABLE stock_transfers (
    id BIGSERIAL NOT NULL, 
    transfer_number VARCHAR NOT NULL, 
    from_location_id BIGINT NOT NULL, 
    to_location_id BIGINT NOT NULL, 
    status VARCHAR NOT NULL, 
    created_by_user_id BIGINT NOT NULL, 
    dispatched_at TIMESTAMP WITH TIME ZONE, 
    received_at TIMESTAMP WITH TIME ZONE, 
    note VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(from_location_id) REFERENCES locations (id), 
    FOREIGN KEY(to_location_id) REFERENCES locations (id), 
    UNIQUE (transfer_number)
);

CREATE INDEX ix_stock_transfers_from_location_id ON stock_transfers (from_location_id);

CREATE INDEX ix_stock_transfers_status ON stock_transfers (status);

CREATE INDEX ix_stock_transfers_to_location_id ON stock_transfers (to_location_id);

CREATE TABLE store_locations (
    id BIGSERIAL NOT NULL, 
    location_id BIGINT NOT NULL, 
    name_ar VARCHAR NOT NULL, 
    name_en VARCHAR NOT NULL, 
    address_ar VARCHAR NOT NULL, 
    address_en VARCHAR NOT NULL, 
    city VARCHAR NOT NULL, 
    latitude NUMERIC(9, 6), 
    longitude NUMERIC(9, 6), 
    phone VARCHAR, 
    opening_hours JSONB, 
    accepts_returns BOOLEAN NOT NULL, 
    is_pickup_point BOOLEAN NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(location_id) REFERENCES locations (id), 
    UNIQUE (location_id)
);

CREATE INDEX ix_store_locations_city ON store_locations (city);

CREATE INDEX ix_store_locations_is_active ON store_locations (is_active);

CREATE TABLE user_roles (
    id BIGSERIAL NOT NULL, 
    user_id BIGINT NOT NULL, 
    role_id BIGINT NOT NULL, 
    location_id BIGINT, 
    granted_by_user_id BIGINT, 
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(granted_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(location_id) REFERENCES locations (id), 
    FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_user_roles_user_id ON user_roles (user_id);

CREATE UNIQUE INDEX uq_user_roles_global ON user_roles (user_id, role_id) WHERE location_id IS NULL;

CREATE UNIQUE INDEX uq_user_roles_scoped ON user_roles (user_id, role_id, location_id) WHERE location_id IS NOT NULL;

CREATE TABLE user_sessions (
    id UUID NOT NULL, 
    user_id BIGINT NOT NULL, 
    refresh_token_hash VARCHAR NOT NULL, 
    ip INET, 
    user_agent VARCHAR, 
    mfa_satisfied BOOLEAN NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    revoked_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (refresh_token_hash)
);

CREATE INDEX ix_user_sessions_expires_at ON user_sessions (expires_at);

CREATE INDEX ix_user_sessions_user_id ON user_sessions (user_id);

CREATE TABLE brands (
    id BIGSERIAL NOT NULL, 
    code VARCHAR NOT NULL, 
    logo_media_id BIGINT, 
    sort_order INTEGER NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(logo_media_id) REFERENCES media (id), 
    UNIQUE (code)
);

CREATE INDEX ix_brands_is_active ON brands (is_active);

CREATE TABLE categories (
    id BIGSERIAL NOT NULL, 
    parent_id BIGINT, 
    dimension VARCHAR NOT NULL, 
    path LTREE NOT NULL, 
    depth SMALLINT NOT NULL, 
    code VARCHAR NOT NULL, 
    image_media_id BIGINT, 
    sort_order INTEGER NOT NULL, 
    show_in_menu BOOLEAN NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(image_media_id) REFERENCES media (id), 
    FOREIGN KEY(parent_id) REFERENCES categories (id), 
    UNIQUE (code)
);

CREATE INDEX ix_categories_dimension ON categories (dimension);

CREATE INDEX ix_categories_is_active ON categories (is_active);

CREATE INDEX ix_categories_parent_id ON categories (parent_id);

CREATE INDEX ix_categories_path ON categories (path);

CREATE TABLE goods_receipts (
    id BIGSERIAL NOT NULL, 
    receipt_number VARCHAR NOT NULL, 
    purchase_order_id BIGINT, 
    location_id BIGINT NOT NULL, 
    supplier_invoice_number VARCHAR, 
    received_by_user_id BIGINT NOT NULL, 
    received_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    note VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(location_id) REFERENCES locations (id), 
    FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id), 
    FOREIGN KEY(received_by_user_id) REFERENCES users (id), 
    UNIQUE (receipt_number)
);

CREATE INDEX ix_goods_receipts_purchase_order_id ON goods_receipts (purchase_order_id);

CREATE INDEX ix_goods_receipts_received_at ON goods_receipts (received_at);

CREATE TABLE option_values (
    id BIGSERIAL NOT NULL, 
    option_id BIGINT NOT NULL, 
    code VARCHAR NOT NULL, 
    hex_color CHAR(7), 
    swatch_media_id BIGINT, 
    sort_order INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(option_id) REFERENCES options (id) ON DELETE CASCADE, 
    FOREIGN KEY(swatch_media_id) REFERENCES media (id), 
    CONSTRAINT uq_option_values_option_code UNIQUE (option_id, code)
);

CREATE TABLE order_addresses (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    type VARCHAR NOT NULL, 
    recipient_name VARCHAR NOT NULL, 
    phone_e164 VARCHAR NOT NULL, 
    line1 VARCHAR NOT NULL, 
    line2 VARCHAR, 
    district VARCHAR, 
    city VARCHAR NOT NULL, 
    region_name VARCHAR NOT NULL, 
    postal_code VARCHAR, 
    country_code CHAR(2) NOT NULL, 
    national_short_address CHAR(8), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE, 
    CONSTRAINT uq_order_addresses_order_type UNIQUE (order_id, type)
);

CREATE INDEX ix_order_addresses_order_id ON order_addresses (order_id);

CREATE TABLE order_notes (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    author_user_id BIGINT, 
    body VARCHAR NOT NULL, 
    is_customer_visible BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(author_user_id) REFERENCES users (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE INDEX ix_order_notes_order_id ON order_notes (order_id);

CREATE TABLE order_status_history (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    field VARCHAR NOT NULL, 
    from_value VARCHAR, 
    to_value VARCHAR NOT NULL, 
    actor_type VARCHAR NOT NULL, 
    actor_user_id BIGINT, 
    reason VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(actor_user_id) REFERENCES users (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE INDEX ix_order_status_history_order_id ON order_status_history (order_id);

CREATE TABLE payments (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    provider VARCHAR NOT NULL, 
    provider_payment_id VARCHAR, 
    method VARCHAR, 
    amount NUMERIC(12, 2) NOT NULL, 
    currency CHAR(3) NOT NULL, 
    status VARCHAR NOT NULL, 
    idempotency_key VARCHAR NOT NULL, 
    authorised_at TIMESTAMP WITH TIME ZONE, 
    captured_at TIMESTAMP WITH TIME ZONE, 
    failure_code VARCHAR, 
    raw_response JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id), 
    UNIQUE (idempotency_key), 
    CONSTRAINT uq_payments_provider_payment_id UNIQUE (provider, provider_payment_id)
);

CREATE INDEX ix_payments_order_id ON payments (order_id);

CREATE INDEX ix_payments_status ON payments (status);

CREATE TABLE shipments (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    carrier_id BIGINT NOT NULL, 
    from_location_id BIGINT NOT NULL, 
    tracking_number VARCHAR, 
    status VARCHAR NOT NULL, 
    label_storage_key VARCHAR, 
    cost NUMERIC(12, 2), 
    shipped_at TIMESTAMP WITH TIME ZONE, 
    delivered_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(carrier_id) REFERENCES carriers (id), 
    FOREIGN KEY(from_location_id) REFERENCES locations (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id)
);

CREATE INDEX ix_shipments_order_id ON shipments (order_id);

CREATE INDEX ix_shipments_status ON shipments (status);

CREATE INDEX ix_shipments_tracking_number ON shipments (tracking_number);

CREATE TABLE brand_translations (
    id BIGSERIAL NOT NULL, 
    brand_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    slug VARCHAR NOT NULL, 
    description VARCHAR, 
    meta_title VARCHAR, 
    meta_description VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE CASCADE, 
    CONSTRAINT uq_brand_translations_brand_locale UNIQUE (brand_id, locale), 
    CONSTRAINT uq_brand_translations_locale_slug UNIQUE (locale, slug)
);

CREATE TABLE category_translations (
    id BIGSERIAL NOT NULL, 
    category_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    slug VARCHAR NOT NULL, 
    description VARCHAR, 
    meta_title VARCHAR, 
    meta_description VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE CASCADE, 
    CONSTRAINT uq_category_translations_category_locale UNIQUE (category_id, locale), 
    CONSTRAINT uq_category_translations_locale_slug UNIQUE (locale, slug)
);

CREATE TABLE option_value_translations (
    option_value_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    label VARCHAR NOT NULL, 
    PRIMARY KEY (option_value_id, locale), 
    FOREIGN KEY(option_value_id) REFERENCES option_values (id) ON DELETE CASCADE
);

CREATE TABLE payment_refunds (
    id BIGSERIAL NOT NULL, 
    payment_id BIGINT NOT NULL, 
    order_id BIGINT NOT NULL, 
    return_id BIGINT, 
    amount NUMERIC(12, 2) NOT NULL, 
    reason VARCHAR, 
    provider_refund_id VARCHAR, 
    status VARCHAR NOT NULL, 
    created_by_user_id BIGINT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id), 
    FOREIGN KEY(payment_id) REFERENCES payments (id), 
    UNIQUE (provider_refund_id)
);

CREATE INDEX ix_payment_refunds_order_id ON payment_refunds (order_id);

CREATE INDEX ix_payment_refunds_payment_id ON payment_refunds (payment_id);

CREATE INDEX ix_payment_refunds_status ON payment_refunds (status);

CREATE TABLE products (
    id BIGSERIAL NOT NULL, 
    brand_id BIGINT, 
    product_type VARCHAR NOT NULL, 
    status VARCHAR NOT NULL, 
    default_variant_id BIGINT, 
    base_price NUMERIC(12, 2) NOT NULL, 
    tax_class VARCHAR NOT NULL, 
    is_featured BOOLEAN NOT NULL, 
    rating_avg NUMERIC(3, 2), 
    rating_count INTEGER NOT NULL, 
    published_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(brand_id) REFERENCES brands (id)
);

CREATE INDEX ix_products_brand_id ON products (brand_id);

CREATE INDEX ix_products_is_featured ON products (is_featured);

CREATE INDEX ix_products_product_type ON products (product_type);

CREATE INDEX ix_products_published_at ON products (published_at);

CREATE INDEX ix_products_status ON products (status);

CREATE TABLE product_attributes (
    product_id BIGINT NOT NULL, 
    attribute_id BIGINT NOT NULL, 
    value_text JSONB, 
    value_number NUMERIC(12, 3), 
    value_bool BOOLEAN, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (product_id, attribute_id), 
    FOREIGN KEY(attribute_id) REFERENCES attributes (id) ON DELETE CASCADE, 
    FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE product_categories (
    product_id BIGINT NOT NULL, 
    category_id BIGINT NOT NULL, 
    is_primary BOOLEAN NOT NULL, 
    sort_order INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (product_id, category_id), 
    FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE CASCADE, 
    FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE product_media (
    id BIGSERIAL NOT NULL, 
    product_id BIGINT NOT NULL, 
    media_id BIGINT NOT NULL, 
    option_value_id BIGINT, 
    sort_order INTEGER NOT NULL, 
    is_primary BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(media_id) REFERENCES media (id), 
    FOREIGN KEY(option_value_id) REFERENCES option_values (id), 
    FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX ix_product_media_option_value_id ON product_media (option_value_id);

CREATE INDEX ix_product_media_product_id ON product_media (product_id);

CREATE TABLE product_translations (
    id BIGSERIAL NOT NULL, 
    product_id BIGINT NOT NULL, 
    locale VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    slug VARCHAR NOT NULL, 
    short_description VARCHAR, 
    description VARCHAR, 
    meta_title VARCHAR, 
    meta_description VARCHAR, 
    search_text TSVECTOR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
    CONSTRAINT uq_product_translations_locale_slug UNIQUE (locale, slug), 
    CONSTRAINT uq_product_translations_product_locale UNIQUE (product_id, locale)
);

CREATE INDEX ix_product_translations_search_text ON product_translations USING gin (search_text);

CREATE TABLE returns (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    rma_number VARCHAR NOT NULL, 
    type VARCHAR NOT NULL, 
    status VARCHAR NOT NULL, 
    channel VARCHAR NOT NULL, 
    reason_code VARCHAR NOT NULL, 
    received_location_id BIGINT, 
    refund_id BIGINT, 
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    received_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id), 
    FOREIGN KEY(received_location_id) REFERENCES locations (id), 
    FOREIGN KEY(refund_id) REFERENCES payment_refunds (id), 
    UNIQUE (rma_number)
);

CREATE INDEX ix_returns_order_id ON returns (order_id);

CREATE INDEX ix_returns_status ON returns (status);

CREATE TABLE variants (
    id BIGSERIAL NOT NULL, 
    product_id BIGINT NOT NULL, 
    sku VARCHAR NOT NULL, 
    barcode VARCHAR, 
    price NUMERIC(12, 2), 
    compare_at_price NUMERIC(12, 2), 
    cost_price NUMERIC(12, 2), 
    weight_grams INTEGER, 
    low_stock_threshold INTEGER, 
    position INTEGER NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    discontinued_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
    UNIQUE (barcode), 
    UNIQUE (sku)
);

CREATE INDEX ix_variants_is_active ON variants (is_active);

CREATE INDEX ix_variants_product_id ON variants (product_id);

CREATE TABLE order_items (
    id BIGSERIAL NOT NULL, 
    order_id BIGINT NOT NULL, 
    variant_id BIGINT NOT NULL, 
    product_id BIGINT NOT NULL, 
    sku_snapshot VARCHAR NOT NULL, 
    name_snapshot VARCHAR NOT NULL, 
    options_snapshot JSONB NOT NULL, 
    unit_price_snapshot NUMERIC(12, 2) NOT NULL, 
    tax_rate_snapshot NUMERIC(5, 4) NOT NULL, 
    qty INTEGER NOT NULL, 
    qty_fulfilled INTEGER NOT NULL, 
    qty_returned INTEGER NOT NULL, 
    line_total NUMERIC(12, 2) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE, 
    FOREIGN KEY(product_id) REFERENCES products (id), 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_order_items_order_id ON order_items (order_id);

CREATE TABLE purchase_order_items (
    id BIGSERIAL NOT NULL, 
    purchase_order_id BIGINT NOT NULL, 
    variant_id BIGINT NOT NULL, 
    qty_ordered INTEGER NOT NULL, 
    qty_received INTEGER NOT NULL, 
    unit_cost NUMERIC(12, 2) NOT NULL, 
    line_total NUMERIC(12, 2) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_purchase_order_items_purchase_order_id ON purchase_order_items (purchase_order_id);

CREATE TABLE stock_count_items (
    id BIGSERIAL NOT NULL, 
    stock_count_id BIGINT NOT NULL, 
    variant_id BIGINT NOT NULL, 
    system_qty INTEGER NOT NULL, 
    counted_qty INTEGER, 
    variance INTEGER GENERATED ALWAYS AS (counted_qty - system_qty) STORED, 
    counted_by_user_id BIGINT, 
    counted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(counted_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(stock_count_id) REFERENCES stock_counts (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_stock_count_items_stock_count_id ON stock_count_items (stock_count_id);

CREATE TABLE stock_levels (
    variant_id BIGINT NOT NULL, 
    location_id BIGINT NOT NULL, 
    on_hand INTEGER NOT NULL, 
    reserved INTEGER NOT NULL, 
    incoming INTEGER NOT NULL, 
    safety_stock INTEGER NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (variant_id, location_id), 
    FOREIGN KEY(location_id) REFERENCES locations (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id) ON DELETE CASCADE
);

CREATE TABLE stock_movements (
    id BIGSERIAL NOT NULL, 
    variant_id BIGINT NOT NULL, 
    location_id BIGINT NOT NULL, 
    qty_delta INTEGER NOT NULL, 
    reason VARCHAR NOT NULL, 
    ref_type VARCHAR, 
    ref_id BIGINT, 
    unit_cost NUMERIC(12, 2), 
    balance_after INTEGER, 
    actor_user_id BIGINT, 
    note VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(actor_user_id) REFERENCES users (id), 
    FOREIGN KEY(location_id) REFERENCES locations (id), 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_stock_movements_created_at ON stock_movements (created_at);

CREATE INDEX ix_stock_movements_location_id ON stock_movements (location_id);

CREATE INDEX ix_stock_movements_reason ON stock_movements (reason);

CREATE INDEX ix_stock_movements_ref_id ON stock_movements (ref_id);

CREATE INDEX ix_stock_movements_variant_id ON stock_movements (variant_id);

CREATE TABLE stock_transfer_items (
    id BIGSERIAL NOT NULL, 
    transfer_id BIGINT NOT NULL, 
    variant_id BIGINT NOT NULL, 
    qty_requested INTEGER NOT NULL, 
    qty_dispatched INTEGER NOT NULL, 
    qty_received INTEGER NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(transfer_id) REFERENCES stock_transfers (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_stock_transfer_items_transfer_id ON stock_transfer_items (transfer_id);

CREATE TABLE variant_media (
    variant_id BIGINT NOT NULL, 
    media_id BIGINT NOT NULL, 
    sort_order INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (variant_id, media_id), 
    FOREIGN KEY(media_id) REFERENCES media (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id) ON DELETE CASCADE
);

CREATE TABLE variant_option_values (
    variant_id BIGINT NOT NULL, 
    option_value_id BIGINT NOT NULL, 
    PRIMARY KEY (variant_id, option_value_id), 
    FOREIGN KEY(option_value_id) REFERENCES option_values (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id) ON DELETE CASCADE
);

CREATE TABLE goods_receipt_items (
    id BIGSERIAL NOT NULL, 
    goods_receipt_id BIGINT NOT NULL, 
    purchase_order_item_id BIGINT, 
    variant_id BIGINT NOT NULL, 
    qty INTEGER NOT NULL, 
    qty_rejected INTEGER NOT NULL, 
    unit_cost NUMERIC(12, 2), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(goods_receipt_id) REFERENCES goods_receipts (id) ON DELETE CASCADE, 
    FOREIGN KEY(purchase_order_item_id) REFERENCES purchase_order_items (id), 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_goods_receipt_items_goods_receipt_id ON goods_receipt_items (goods_receipt_id);

CREATE TABLE return_items (
    id BIGSERIAL NOT NULL, 
    return_id BIGINT NOT NULL, 
    order_item_id BIGINT NOT NULL, 
    variant_id BIGINT NOT NULL, 
    qty INTEGER NOT NULL, 
    condition VARCHAR, 
    restock BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_item_id) REFERENCES order_items (id), 
    FOREIGN KEY(return_id) REFERENCES returns (id) ON DELETE CASCADE, 
    FOREIGN KEY(variant_id) REFERENCES variants (id)
);

CREATE INDEX ix_return_items_return_id ON return_items (return_id);

CREATE TABLE shipment_items (
    shipment_id BIGINT NOT NULL, 
    order_item_id BIGINT NOT NULL, 
    qty INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (shipment_id, order_item_id), 
    FOREIGN KEY(order_item_id) REFERENCES order_items (id), 
    FOREIGN KEY(shipment_id) REFERENCES shipments (id) ON DELETE CASCADE
);

ALTER TABLE products ADD CONSTRAINT fk_products_default_variant_id FOREIGN KEY(default_variant_id) REFERENCES variants (id);

ALTER TABLE payment_refunds ADD CONSTRAINT fk_payment_refunds_return_id FOREIGN KEY(return_id) REFERENCES returns (id);

INSERT INTO alembic_version (version_num) VALUES ('04f50a7431fd') RETURNING alembic_version.version_num;

COMMIT;

