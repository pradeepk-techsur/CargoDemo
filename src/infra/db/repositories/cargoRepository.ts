/**
 * Cargo entry repository — named prepared statements, bound parameters only.
 * No ORM, no query builder, no caller-supplied string concatenated into SQL
 * (T-01-01). Factory takes a Db handle so tests can pass a temp database.
 */

import type { Db } from '../connection.js';
import type { CargoEntryRow, DocumentRow } from '../../../shared/types/db.js';

export interface CargoRepository {
  getById(id: string): CargoEntryRow | undefined;
  getByShipmentId(shipmentId: string): CargoEntryRow | undefined;
  listAll(): CargoEntryRow[];
  insert(row: CargoEntryRow): void;
  listDocuments(cargoEntryId: string): DocumentRow[];
}

export function createCargoRepository(db: Db): CargoRepository {
  const getByIdStmt = db.prepare('SELECT * FROM cargo_entries WHERE id = ?');
  const getByShipmentStmt = db.prepare('SELECT * FROM cargo_entries WHERE shipment_id = ?');
  const listAllStmt = db.prepare('SELECT * FROM cargo_entries ORDER BY shipment_id');
  const listDocsStmt = db.prepare(
    'SELECT * FROM documents WHERE cargo_entry_id = ? ORDER BY document_type',
  );
  const insertStmt = db.prepare(
    `INSERT INTO cargo_entries
       (id, shipment_id, importer_name, carrier_name, product_description,
        hts_code, hts_code_normalized, country_of_origin, country_of_origin_iso2,
        manufacturer_name, manufacturer_address_line1, manufacturer_address_city,
        manufacturer_address_region, manufacturer_address_postal_code,
        manufacturer_address_country, manufacturer_address_country_iso2,
        shipment_value_cents, entry_date, declared_priority_hint, ingestion_source,
        ingestion_batch_id, created_at, updated_at)
     VALUES
       (@id, @shipment_id, @importer_name, @carrier_name, @product_description,
        @hts_code, @hts_code_normalized, @country_of_origin, @country_of_origin_iso2,
        @manufacturer_name, @manufacturer_address_line1, @manufacturer_address_city,
        @manufacturer_address_region, @manufacturer_address_postal_code,
        @manufacturer_address_country, @manufacturer_address_country_iso2,
        @shipment_value_cents, @entry_date, @declared_priority_hint, @ingestion_source,
        @ingestion_batch_id, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       shipment_id = excluded.shipment_id, importer_name = excluded.importer_name,
       carrier_name = excluded.carrier_name, product_description = excluded.product_description,
       hts_code = excluded.hts_code, hts_code_normalized = excluded.hts_code_normalized,
       country_of_origin = excluded.country_of_origin,
       country_of_origin_iso2 = excluded.country_of_origin_iso2,
       manufacturer_name = excluded.manufacturer_name,
       manufacturer_address_line1 = excluded.manufacturer_address_line1,
       manufacturer_address_city = excluded.manufacturer_address_city,
       manufacturer_address_region = excluded.manufacturer_address_region,
       manufacturer_address_postal_code = excluded.manufacturer_address_postal_code,
       manufacturer_address_country = excluded.manufacturer_address_country,
       manufacturer_address_country_iso2 = excluded.manufacturer_address_country_iso2,
       shipment_value_cents = excluded.shipment_value_cents, entry_date = excluded.entry_date,
       declared_priority_hint = excluded.declared_priority_hint,
       ingestion_source = excluded.ingestion_source,
       ingestion_batch_id = excluded.ingestion_batch_id, updated_at = excluded.updated_at`,
  );

  return {
    getById: (id) => getByIdStmt.get(id) as CargoEntryRow | undefined,
    getByShipmentId: (shipmentId) =>
      getByShipmentStmt.get(shipmentId) as CargoEntryRow | undefined,
    listAll: () => listAllStmt.all() as CargoEntryRow[],
    insert: (row) => {
      insertStmt.run(row);
    },
    listDocuments: (cargoEntryId) => listDocsStmt.all(cargoEntryId) as DocumentRow[],
  };
}
