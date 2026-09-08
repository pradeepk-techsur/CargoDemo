/**
 * The system band, label-value layout, all eight mandated attributes plus the
 * entry date. The manufacturer address country is emphasised because it is the
 * field that conflicts; the HTS code is annotated with its normalized digit count.
 */

import type { ShipmentDetail } from '../../../shared/api';
import { formatUsd } from '../../api/enums';
import { Panel } from '../../components/ui';
import styles from './Review.module.css';

function Field(props: { name: string; label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{props.label}</dt>
      <dd className={styles.fieldValue} data-testid={`entry-field-${props.name}`}>
        {props.children}
      </dd>
    </div>
  );
}

export function EntryDataPanel(props: { shipment: ShipmentDetail }): JSX.Element {
  const s = props.shipment;
  const addr = s.manufacturer.address;
  const addressParts = [addr.line1, addr.city, addr.region, addr.postal_code].filter(
    (p): p is string => Boolean(p),
  );

  return (
    <Panel title="Entry data" systemFinding testId="entry-data-panel">
      <dl className={styles.fieldGrid}>
        <Field name="importer" label="Importer">
          {s.importer_name}
        </Field>
        <Field name="carrier" label="Carrier">
          {s.carrier_name}
        </Field>
        <Field name="product-description" label="Product description">
          {s.product_description}
        </Field>
        <Field name="hts-code" label="HTS code">
          <span className={styles.mono}>{s.hts_code ?? '—'}</span>
          {s.hts_digit_count !== null ? (
            <span className={styles.annotation}> · {s.hts_digit_count} digits normalized</span>
          ) : null}
        </Field>
        <Field name="country-of-origin" label="Country of origin">
          {s.country_of_origin}
        </Field>
        <Field name="manufacturer-name" label="Manufacturer">
          {s.manufacturer.name}
        </Field>
        <Field name="manufacturer-address" label="Manufacturer address">
          {addressParts.join(', ')}
          {addressParts.length ? ', ' : ''}
          <strong className={styles.emphasisCountry}>{addr.country}</strong>
        </Field>
        <Field name="shipment-value" label="Shipment value">
          {formatUsd(s.shipment_value_usd)}
        </Field>
        <Field name="entry-date" label="Entry date">
          {s.entry_date}
        </Field>
      </dl>
    </Panel>
  );
}
