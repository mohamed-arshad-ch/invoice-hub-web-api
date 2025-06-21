-- Transaction Payments Table
-- This table stores individual payments made against transactions
-- Allows tracking of partial payments for transactions

CREATE TABLE transaction_payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure payment amount is not negative
    CONSTRAINT positive_payment_amount CHECK (amount > 0),
    
    -- Add index for performance
    INDEX idx_transaction_payments_transaction_id (transaction_id),
    INDEX idx_transaction_payments_payment_date (payment_date),
    INDEX idx_transaction_payments_created_by (created_by)
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_payments_updated_at
    BEFORE UPDATE ON transaction_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_payments_updated_at();

-- Add comment for documentation
COMMENT ON TABLE transaction_payments IS 'Stores individual payments made against transactions, enabling partial payment tracking';
COMMENT ON COLUMN transaction_payments.transaction_id IS 'Reference to the parent transaction';
COMMENT ON COLUMN transaction_payments.amount IS 'Amount of this specific payment (must be positive)';
COMMENT ON COLUMN transaction_payments.payment_date IS 'Date when the payment was received';
COMMENT ON COLUMN transaction_payments.payment_method IS 'Method used for this payment (Bank Transfer, Cash, etc.)';
COMMENT ON COLUMN transaction_payments.reference_number IS 'Reference number for this payment (bank ref, cheque no, etc.)';
COMMENT ON COLUMN transaction_payments.notes IS 'Additional notes about this payment';
COMMENT ON COLUMN transaction_payments.created_by IS 'ID of the user who recorded this payment';

-- ===================================================================
-- LEDGER TABLE CONSTRAINT UPDATE
-- ===================================================================
-- Updated the ledger table reference_type constraint to include 'transaction_payment'
-- This allows the system to create ledger entries for transaction payments

-- Previous constraint (REMOVED):
-- ALTER TABLE ledger DROP CONSTRAINT ledger_reference_type_check;

-- Updated constraint (ADDED):
-- ALTER TABLE ledger ADD CONSTRAINT ledger_reference_type_check 
-- CHECK (reference_type IN ('client_transaction', 'staff_payment', 'transaction_payment'));

-- This update allows the payment recording system to create ledger entries with 
-- reference_type = 'transaction_payment' when recording payments against transactions. 

-- ===================================================================
-- QUICK TRANSACTION TEMPLATES TABLE
-- ===================================================================
-- This table stores templates for quick transaction creation
-- Allows users to create predefined transaction templates for faster invoicing

CREATE TABLE quick_transaction_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    tax_rate DECIMAL(5, 2) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add indexes for performance
    INDEX idx_quick_transaction_templates_client_id (client_id),
    INDEX idx_quick_transaction_templates_product_id (product_id),
    INDEX idx_quick_transaction_templates_created_by (created_by),
    INDEX idx_quick_transaction_templates_is_active (is_active)
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_transaction_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quick_transaction_templates_updated_at
    BEFORE UPDATE ON quick_transaction_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_quick_transaction_templates_updated_at();

-- Add comments for documentation
COMMENT ON TABLE quick_transaction_templates IS 'Stores templates for quick transaction creation to speed up invoicing process';
COMMENT ON COLUMN quick_transaction_templates.name IS 'Display name for the quick transaction template';
COMMENT ON COLUMN quick_transaction_templates.description IS 'Description of the transaction template';
COMMENT ON COLUMN quick_transaction_templates.client_id IS 'Reference to the client for this template';
COMMENT ON COLUMN quick_transaction_templates.product_id IS 'Reference to the product/service for this template';
COMMENT ON COLUMN quick_transaction_templates.quantity IS 'Default quantity for this template';
COMMENT ON COLUMN quick_transaction_templates.unit_price IS 'Unit price for the product/service';
COMMENT ON COLUMN quick_transaction_templates.tax_rate IS 'Tax rate percentage (0-100)';
COMMENT ON COLUMN quick_transaction_templates.payment_method IS 'Default payment method for transactions created from this template';
COMMENT ON COLUMN quick_transaction_templates.notes IS 'Default notes for transactions created from this template';
COMMENT ON COLUMN quick_transaction_templates.is_active IS 'Whether this template is active and available for use';
COMMENT ON COLUMN quick_transaction_templates.created_by IS 'ID of the user who created this template';

-- ===================================================================
-- QUICK STAFF PAYMENT TEMPLATES TABLE
-- ===================================================================
-- This table stores templates for quick staff payment creation
-- Allows users to create predefined staff payment templates for faster payroll processing

CREATE TABLE quick_staff_payment_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add indexes for performance
    INDEX idx_quick_staff_payment_templates_staff_id (staff_id),
    INDEX idx_quick_staff_payment_templates_created_by (created_by),
    INDEX idx_quick_staff_payment_templates_is_active (is_active)
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quick_staff_payment_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quick_staff_payment_templates_updated_at
    BEFORE UPDATE ON quick_staff_payment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_quick_staff_payment_templates_updated_at();

-- Add comments for documentation
COMMENT ON TABLE quick_staff_payment_templates IS 'Stores templates for quick staff payment creation to speed up payroll processing';
COMMENT ON COLUMN quick_staff_payment_templates.name IS 'Display name for the quick staff payment template';
COMMENT ON COLUMN quick_staff_payment_templates.description IS 'Description of the staff payment template';
COMMENT ON COLUMN quick_staff_payment_templates.staff_id IS 'Reference to the staff member for this template';
COMMENT ON COLUMN quick_staff_payment_templates.amount IS 'Payment amount for this template';
COMMENT ON COLUMN quick_staff_payment_templates.payment_method IS 'Default payment method for payments created from this template';
COMMENT ON COLUMN quick_staff_payment_templates.notes IS 'Default notes for payments created from this template';
COMMENT ON COLUMN quick_staff_payment_templates.is_active IS 'Whether this template is active and available for use';
COMMENT ON COLUMN quick_staff_payment_templates.created_by IS 'ID of the user who created this template'; 