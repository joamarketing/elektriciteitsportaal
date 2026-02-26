-- ============================================
-- DATABASE UPDATE SCRIPT
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- 1. Voeg amount_with_marge kolom toe aan invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_with_marge DECIMAL(12,2);

-- 2. Update bestaande invoices met marge (10%)
UPDATE invoices 
SET amount_with_marge = total_amount * 1.10
WHERE amount_with_marge IS NULL;

-- 3. Pas meter_readings aan: consumption wordt nu apart opgeslagen
-- (niet meer als generated column)
-- Eerst checken of consumption al bestaat
DO $$ 
BEGIN
    -- Drop the generated column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meter_readings' 
        AND column_name = 'consumption'
        AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE meter_readings DROP COLUMN consumption;
        ALTER TABLE meter_readings ADD COLUMN consumption DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- 4. Voeg consumption kolom toe als die nog niet bestaat
ALTER TABLE meter_readings 
ADD COLUMN IF NOT EXISTS consumption DECIMAL(12,2) DEFAULT 0;

-- 5. Sta NULL toe voor tenant_id (voor algemene meter)
-- Dit zou al moeten werken, maar voor de zekerheid:
ALTER TABLE meter_readings 
ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================
-- KLAAR!
-- ============================================
