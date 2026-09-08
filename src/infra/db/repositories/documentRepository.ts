/**
 * Document repository — named prepared statements, bound parameters only.
 */

import type { Db } from '../connection.js';
import type { DocumentRow } from '../../../shared/types/db.js';

export interface DocumentRepository {
  listByEntry(cargoEntryId: string): DocumentRow[];
  listReceivedByEntry(cargoEntryId: string): DocumentRow[];
  getById(id: string): DocumentRow | undefined;
  upsert(row: DocumentRow): void;
}

export function createDocumentRepository(db: Db): DocumentRepository {
  const listByEntryStmt = db.prepare(
    'SELECT * FROM documents WHERE cargo_entry_id = ? ORDER BY document_type',
  );
  const listReceivedStmt = db.prepare(
    "SELECT * FROM documents WHERE cargo_entry_id = ? AND status = 'RECEIVED' AND superseded = 0 ORDER BY document_type",
  );
  const getByIdStmt = db.prepare('SELECT * FROM documents WHERE id = ?');
  const upsertStmt = db.prepare(
    `INSERT INTO documents
       (id, cargo_entry_id, document_type, status, filename, storage_path, content_hash,
        file_size_bytes, mime_type, provenance, stated_country, note, superseded,
        duplicate_of_document_id, source_request_id, uploaded_by_user_id, received_at, created_at)
     VALUES
       (@id, @cargo_entry_id, @document_type, @status, @filename, @storage_path, @content_hash,
        @file_size_bytes, @mime_type, @provenance, @stated_country, @note, @superseded,
        @duplicate_of_document_id, @source_request_id, @uploaded_by_user_id, @received_at, @created_at)
     ON CONFLICT(id) DO UPDATE SET
       cargo_entry_id = excluded.cargo_entry_id, document_type = excluded.document_type,
       status = excluded.status, filename = excluded.filename,
       storage_path = excluded.storage_path, content_hash = excluded.content_hash,
       file_size_bytes = excluded.file_size_bytes, mime_type = excluded.mime_type,
       provenance = excluded.provenance, stated_country = excluded.stated_country,
       note = excluded.note, superseded = excluded.superseded,
       duplicate_of_document_id = excluded.duplicate_of_document_id,
       source_request_id = excluded.source_request_id,
       uploaded_by_user_id = excluded.uploaded_by_user_id, received_at = excluded.received_at`,
  );

  return {
    listByEntry: (cargoEntryId) => listByEntryStmt.all(cargoEntryId) as DocumentRow[],
    listReceivedByEntry: (cargoEntryId) => listReceivedStmt.all(cargoEntryId) as DocumentRow[],
    getById: (id) => getByIdStmt.get(id) as DocumentRow | undefined,
    upsert: (row) => {
      upsertStmt.run(row);
    },
  };
}
