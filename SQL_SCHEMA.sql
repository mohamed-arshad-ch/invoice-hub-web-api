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