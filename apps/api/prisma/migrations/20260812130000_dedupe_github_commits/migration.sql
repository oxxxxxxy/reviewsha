-- Keep the oldest imported copy when an earlier sync created the same commit
-- more than once. Soft-delete duplicates so existing scan references and
-- object-storage cleanup policies remain intact.
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, LOWER(source_commit)
      ORDER BY source_committed_at ASC NULLS LAST, created_at ASC, id ASC
    ) AS duplicate_number
  FROM uploaded_files
  WHERE source_type = 'GITHUB'
    AND source_commit IS NOT NULL
    AND deleted_at IS NULL
)
UPDATE uploaded_files AS uploaded
SET deleted_at = NOW()
FROM duplicates
WHERE uploaded.id = duplicates.id
  AND duplicates.duplicate_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "uploaded_files_project_github_commit_unique"
  ON uploaded_files (project_id, LOWER(source_commit))
  WHERE source_type = 'GITHUB'
    AND source_commit IS NOT NULL
    AND deleted_at IS NULL;
