-- ============================================================
-- V2: TestRun ağır veri ayrımı + User ayar kolonları
-- Mevcut veri KAYBOLMAZ. (FLAYWAY)
-- ============================================================

-- 1. test_run_detail tablosunu oluştur
CREATE TABLE IF NOT EXISTS test_run_detail (
                                               id                  BIGSERIAL PRIMARY KEY,
                                               test_run_id         BIGINT NOT NULL UNIQUE,
                                               error_message       TEXT,
                                               screenshot_base64   TEXT,
                                               CONSTRAINT fk_detail_run
                                               FOREIGN KEY (test_run_id)
    REFERENCES test_run(id)
    ON DELETE CASCADE
    );

-- 2. Mevcut ağır verileri taşı
INSERT INTO test_run_detail (test_run_id, error_message, screenshot_base64)
SELECT id, error_message, screenshot_base64
FROM test_run
WHERE error_message IS NOT NULL
   OR screenshot_base64 IS NOT NULL
    ON CONFLICT DO NOTHING;

-- 3. Geriye dönük özet kolonu ekle
ALTER TABLE test_run
    ADD COLUMN IF NOT EXISTS error_summary  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS triggered_by   VARCHAR(150);

-- 4. Özeti doldur
UPDATE test_run
SET error_summary = LEFT(error_message, 500)
WHERE error_message IS NOT NULL;

-- 5. Ağır kolonları kaldır
ALTER TABLE test_run
DROP COLUMN IF EXISTS error_message,
    DROP COLUMN IF EXISTS screenshot_base64;

-- 6. User tablosuna ayar kolonları ekle
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS theme              VARCHAR(20)  NOT NULL DEFAULT 'dark',
    ADD COLUMN IF NOT EXISTS default_browser    VARCHAR(30)  NOT NULL DEFAULT 'chrome',
    ADD COLUMN IF NOT EXISTS auto_close_driver  BOOLEAN      NOT NULL DEFAULT true;

-- 7. Role kolonu string'e çevir (varsa)
ALTER TABLE users
ALTER COLUMN role TYPE VARCHAR(20) USING role::VARCHAR;