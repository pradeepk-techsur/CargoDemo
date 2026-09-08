/**
 * Evidence repository — named prepared statements, bound parameters only.
 * Evidence values are copied verbatim from entry fields; they are always BOUND,
 * never interpolated (T-02-04).
 */

import type { Db } from '../connection.js';
import type { EvidenceRow } from '../../../shared/types/db.js';

export interface EvidenceRepository {
  insert(row: EvidenceRow): void;
  listByException(exceptionId: string): EvidenceRow[];
}

export function createEvidenceRepository(db: Db): EvidenceRepository {
  const insertStmt = db.prepare(
    `INSERT INTO evidence
       (id, exception_id, kind, field_path, raw_value, normalized_value,
        comparison_field_path, comparison_raw_value, comparison_normalized_value,
        expected, observed, assertion, truncated, display_order, created_at)
     VALUES
       (@id, @exception_id, @kind, @field_path, @raw_value, @normalized_value,
        @comparison_field_path, @comparison_raw_value, @comparison_normalized_value,
        @expected, @observed, @assertion, @truncated, @display_order, @created_at)`,
  );
  const listStmt = db.prepare(
    'SELECT * FROM evidence WHERE exception_id = ? ORDER BY display_order ASC',
  );

  return {
    insert: (row) => {
      insertStmt.run(row);
    },
    listByException: (exceptionId) => listStmt.all(exceptionId) as EvidenceRow[],
  };
}
