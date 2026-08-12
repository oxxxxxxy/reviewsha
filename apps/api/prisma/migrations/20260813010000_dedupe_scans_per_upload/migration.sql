-- A completed upload can have only one logical analysis. The partial index
-- keeps cancelled/soft-deleted historical rows out of the uniqueness rule.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY source_file_id
           ORDER BY created_at ASC, id ASC
         ) AS duplicate_number
  FROM scans
  WHERE source_file_id IS NOT NULL AND deleted_at IS NULL
)
UPDATE scans AS scan
SET deleted_at = NOW()
FROM duplicates
WHERE scan.id = duplicates.id AND duplicates.duplicate_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "scans_source_file_id_unique"
  ON scans (source_file_id)
  WHERE source_file_id IS NOT NULL AND deleted_at IS NULL;
