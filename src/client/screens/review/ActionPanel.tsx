/**
 * The human band, and the governance claim made visible.
 *
 * Renders ALL FIVE actions on every render, in the fixed order, as a radiogroup.
 * None selected initially, no auto-submit. An unavailable action is disabled with
 * three simultaneous signals (styling, the word UNAVAILABLE, a lock glyph) and its
 * server `reason_text` rendered as a paragraph in the layout — never a tooltip.
 * The submit control is disabled until every required field including the
 * justification minimum is valid.
 *
 * There is no approve/reject control and no authority rail — the approval chain is
 * deferred and out of scope.
 */

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type {
  AvailableAction,
  AvailableActionsResponse,
  ActionCommand,
  ExceptionsResponse,
  ShipmentDetail,
  UserAction,
} from '../../../shared/api';
import { ApiError } from '../../api/client';
import { ACTION_ORDER, actionLabel, statusLabel } from '../../api/enums';
import { useSubmitAction } from '../../api/hooks';
import { JustificationInput } from './JustificationInput';
import styles from './Review.module.css';

const HOLD_REASONS = [
  'AWAITING_EXTERNAL_INPUT',
  'PENDING_POLICY_GUIDANCE',
  'RESOURCE_CONSTRAINT',
  'OTHER',
] as const;

const ESCALATION_REASONS = [
  'POLICY_AMBIGUITY',
  'HIGH_VALUE',
  'REPEAT_OFFENDER_PATTERN',
  'CONFLICTING_EVIDENCE',
  'OTHER',
] as const;

const RESOLUTION_BASES = ['EXCEPTIONS_RESOLVED', 'EXCEPTIONS_ACCEPTED', 'MIXED'] as const;

interface FormState {
  justification: string;
  documentTypes: Set<string>;
  otherDocumentType: string;
  justifyUnlisted: boolean;
  requestedFrom: string;
  dueBy: string;
  assignTo: string;
  resolutionBasis: (typeof RESOLUTION_BASES)[number];
  acknowledgeOutstanding: boolean;
  holdReason: (typeof HOLD_REASONS)[number];
  holdReasonDetail: string;
  reviewBy: string;
  escalationReason: (typeof ESCALATION_REASONS)[number];
  escalationReasonDetail: string;
  escalateTo: string;
}

const emptyForm: FormState = {
  justification: '',
  documentTypes: new Set(),
  otherDocumentType: '',
  justifyUnlisted: false,
  requestedFrom: '',
  dueBy: '',
  assignTo: '',
  resolutionBasis: 'EXCEPTIONS_RESOLVED',
  acknowledgeOutstanding: false,
  holdReason: 'AWAITING_EXTERNAL_INPUT',
  holdReasonDetail: '',
  reviewBy: '',
  escalationReason: 'POLICY_AMBIGUITY',
  escalationReasonDetail: '',
  escalateTo: '',
};

export function ActionPanel(props: {
  shipment: ShipmentDetail;
  availableActions: AvailableActionsResponse;
  exceptions: ExceptionsResponse;
}): JSX.Element {
  const { shipment, availableActions, exceptions } = props;
  const caseId = shipment.case_id;
  const [selected, setSelected] = useState<UserAction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const submit = useSubmitAction(caseId, shipment.shipment_id);

  const actionsByCode = useMemo(() => {
    const map = new Map<UserAction, AvailableAction>();
    for (const a of availableActions.actions) map.set(a.action, a);
    return map;
  }, [availableActions]);

  const selectedAction = selected ? actionsByCode.get(selected) : undefined;
  const minLength = selectedAction?.justification_min_length ?? 10;
  const openExceptionIds = exceptions.open.map((x) => x.exception_id);

  // Terminal state: a read-only disposition summary, not five disabled controls.
  if (shipment.case.status === 'CLEARED') {
    return (
      <section className={styles.actionPanel} data-testid="action-panel">
        <h2>Disposition</h2>
        <div className={styles.dispositionSummary}>
          <p>
            Status: <strong>{statusLabel(shipment.case.status)}</strong>
          </p>
          {shipment.case.cleared_at ? (
            <p>Cleared at: {shipment.case.cleared_at}</p>
          ) : null}
          {shipment.case.approving_official ? (
            <p>
              Recorded by: {shipment.case.approving_official.name} (
              {shipment.case.approving_official.role})
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const missingDocTypes = Array.from(
    new Set(
      exceptions.open.flatMap((x) =>
        x.missing_information
          .map((mi) => mi.document_type)
          .filter((d): d is string => Boolean(d)),
      ),
    ),
  );

  function patch(p: Partial<FormState>): void {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function selectAction(action: UserAction): void {
    const meta = actionsByCode.get(action);
    if (!meta || !meta.available) return;
    setSelected(action);
    // Preserve the typed justification across action changes.
    setForm((prev) => ({ ...emptyForm, justification: prev.justification }));
    submit.reset();
  }

  function buildCommand(): ActionCommand | null {
    if (!selected) return null;
    const justification = form.justification;
    switch (selected) {
      case 'REQUEST_INFORMATION': {
        const types = new Set(form.documentTypes);
        if (form.otherDocumentType.trim()) {
          types.add(form.otherDocumentType.trim().toUpperCase().replace(/\s+/g, '_'));
        }
        return {
          action: 'REQUEST_INFORMATION',
          justification,
          document_types: Array.from(types),
          ...(form.requestedFrom.trim() ? { requested_from: form.requestedFrom.trim() } : {}),
          ...(form.dueBy.trim() ? { due_by: form.dueBy.trim() } : {}),
          ...(form.justifyUnlisted ? { justify_unlisted_document: true } : {}),
        };
      }
      case 'SEND_FOR_SPECIALIST_REVIEW':
        return {
          action: 'SEND_FOR_SPECIALIST_REVIEW',
          justification,
          ...(form.assignTo.trim() ? { assign_to_user_id: form.assignTo.trim() } : {}),
        };
      case 'CLEAR_EXCEPTION':
        return {
          action: 'CLEAR_EXCEPTION',
          justification,
          exception_ids: openExceptionIds,
          resolution_basis: form.resolutionBasis,
          ...(shipment.case.status === 'AWAITING_INFORMATION'
            ? { acknowledge_outstanding_requests: form.acknowledgeOutstanding }
            : {}),
        };
      case 'PLACE_ON_HOLD':
        return {
          action: 'PLACE_ON_HOLD',
          justification,
          hold_reason: form.holdReason,
          ...(form.holdReason === 'OTHER'
            ? { hold_reason_detail: form.holdReasonDetail }
            : {}),
          ...(form.reviewBy.trim() ? { review_by: form.reviewBy.trim() } : {}),
        };
      case 'ESCALATE_TO_SUPERVISOR':
        return {
          action: 'ESCALATE_TO_SUPERVISOR',
          justification,
          escalation_reason: form.escalationReason,
          ...(form.escalationReason === 'OTHER'
            ? { escalation_reason_detail: form.escalationReasonDetail }
            : {}),
          ...(form.escalateTo.trim() ? { escalate_to_user_id: form.escalateTo.trim() } : {}),
        };
      default:
        return null;
    }
  }

  // Client-side required-field validation (the server re-enforces everything).
  function requiredFieldsValid(): boolean {
    if (!selected) return false;
    if (form.justification.trim().length < minLength) return false;
    switch (selected) {
      case 'REQUEST_INFORMATION': {
        const hasType =
          form.documentTypes.size > 0 || form.otherDocumentType.trim().length > 0;
        if (!hasType) return false;
        if (form.otherDocumentType.trim() && !form.justifyUnlisted) return false;
        return true;
      }
      case 'PLACE_ON_HOLD':
        if (form.holdReason === 'OTHER' && form.holdReasonDetail.trim().length < 10)
          return false;
        return true;
      case 'ESCALATE_TO_SUPERVISOR':
        if (
          form.escalationReason === 'OTHER' &&
          form.escalationReasonDetail.trim().length < 10
        )
          return false;
        return true;
      default:
        return true;
    }
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const command = buildCommand();
    if (!command) return;
    submit.mutate({ command, caseVersion: shipment.case.case_version });
  }

  const canSubmit = requiredFieldsValid() && !submit.isPending;
  const error = submit.error instanceof ApiError ? submit.error : null;
  const result = submit.data;

  return (
    <section className={styles.actionPanel} data-testid="action-panel">
      <h2>Record a decision</h2>

      {result ? (
        <div
          className={styles.confirmation}
          data-testid="action-confirmation"
          role="status"
          aria-live="polite"
        >
          <p>
            Recorded <strong>{actionLabel(result.action)}</strong>.
          </p>
          <p>
            Status changed: {statusLabel(result.status.before)} →{' '}
            <strong>{statusLabel(result.status.after)}</strong>
          </p>
          <blockquote className={styles.humanBand}>
            <p className={styles.quotedJustification}>{result.justification}</p>
            <footer>
              — {result.acting_user.name} ({result.acting_user.role})
            </footer>
          </blockquote>
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <div role="radiogroup" aria-label="Workflow action" className={styles.actionGroup}>
          {ACTION_ORDER.map((action) => {
            const meta = actionsByCode.get(action);
            const available = meta?.available ?? false;
            const isSelected = selected === action;
            return (
              <div
                key={action}
                className={`${styles.actionOption} ${available ? '' : styles.actionUnavailable}`}
                data-testid={`action-option-${action}`}
                data-available={available ? 'true' : 'false'}
              >
                <label className={styles.actionLabelRow}>
                  <input
                    type="radio"
                    name="action"
                    value={action}
                    checked={isSelected}
                    disabled={!available}
                    aria-disabled={!available}
                    aria-describedby={
                      !available ? `reason-${action}` : undefined
                    }
                    onChange={() => selectAction(action)}
                  />
                  <span>{actionLabel(action)}</span>
                  {!available ? (
                    <span className={styles.unavailableBadge}>
                      <span aria-hidden="true">🔒</span> UNAVAILABLE
                    </span>
                  ) : null}
                </label>
                {!available && meta?.reason_text ? (
                  <p
                    id={`reason-${action}`}
                    className={`${styles.reasonText} reason-text`}
                    data-testid="action-unavailable-reason"
                  >
                    {meta.reason_text}
                  </p>
                ) : null}

                {isSelected ? (
                  <div className={styles.actionFields}>
                    {renderFields(action)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {selected ? (
          <JustificationInput
            value={form.justification}
            min={minLength}
            onChange={(v) => patch({ justification: v })}
          />
        ) : null}

        {error ? (
          <div className={styles.actionError} data-testid="action-error" role="alert">
            <p>{error.message}</p>
            <p className={styles.errorRef}>Reference: {error.request_id}</p>
            {error.field_errors && error.field_errors.length ? (
              <ul>
                {error.field_errors.map((fe, i) => (
                  <li key={i}>
                    {fe.path}: {fe.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {error.code === 'CASE_VERSION_CONFLICT' ? (
              <p>The case changed since you loaded it. It has been refreshed — please review and resubmit.</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          className={styles.submitButton}
          data-testid="action-submit"
          disabled={!canSubmit}
        >
          {submit.isPending ? 'Submitting…' : 'Submit decision'}
        </button>
      </form>
    </section>
  );

  function renderFields(action: UserAction): JSX.Element | null {
    switch (action) {
      case 'REQUEST_INFORMATION':
        return (
          <div data-testid="field-document-types" className={styles.fieldBlock}>
            <fieldset className={styles.innerFieldset}>
              <legend>Document types</legend>
              {missingDocTypes.length === 0 ? (
                <p className={styles.reasonText}>
                  No missing document types on the open exceptions.
                </p>
              ) : (
                missingDocTypes.map((dt) => (
                  <label key={dt} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={form.documentTypes.has(dt)}
                      onChange={() => {
                        const next = new Set(form.documentTypes);
                        if (next.has(dt)) next.delete(dt);
                        else next.add(dt);
                        patch({ documentTypes: next });
                      }}
                    />
                    {dt}
                  </label>
                ))
              )}
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.justifyUnlisted}
                  onChange={(e) => patch({ justifyUnlisted: e.target.checked })}
                />
                Add an unlisted document type
              </label>
              {form.justifyUnlisted ? (
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="OTHER_DOCUMENT_TYPE"
                  value={form.otherDocumentType}
                  onChange={(e) => patch({ otherDocumentType: e.target.value })}
                />
              ) : null}
            </fieldset>
            <label className={styles.selectRow}>
              Requested from (descriptive only — nothing is transmitted)
              <input
                type="text"
                className={styles.textInput}
                value={form.requestedFrom}
                onChange={(e) => patch({ requestedFrom: e.target.value })}
              />
            </label>
            <label className={styles.selectRow}>
              Due by (informational only)
              <input
                type="date"
                className={styles.textInput}
                value={form.dueBy}
                onChange={(e) => patch({ dueBy: e.target.value })}
              />
            </label>
          </div>
        );
      case 'SEND_FOR_SPECIALIST_REVIEW':
        return (
          <div data-testid="field-assign-to" className={styles.fieldBlock}>
            <label className={styles.selectRow}>
              Assign to (optional — leave blank if unknown)
              <input
                type="text"
                className={styles.textInput}
                value={form.assignTo}
                onChange={(e) => patch({ assignTo: e.target.value })}
              />
            </label>
          </div>
        );
      case 'CLEAR_EXCEPTION':
        return (
          <div data-testid="field-resolution-basis" className={styles.fieldBlock}>
            <label className={styles.selectRow}>
              Resolution basis
              <select
                className={styles.select}
                value={form.resolutionBasis}
                onChange={(e) =>
                  patch({ resolutionBasis: e.target.value as FormState['resolutionBasis'] })
                }
              >
                {RESOLUTION_BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.reasonText}>
              Clearing the exact current open set ({openExceptionIds.length} exception
              {openExceptionIds.length === 1 ? '' : 's'}). The acting user is recorded as
              making this decision.
            </p>
            {shipment.case.status === 'AWAITING_INFORMATION' ? (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.acknowledgeOutstanding}
                  onChange={(e) => patch({ acknowledgeOutstanding: e.target.checked })}
                />
                Acknowledge outstanding requests
              </label>
            ) : null}
          </div>
        );
      case 'PLACE_ON_HOLD':
        return (
          <div data-testid="field-hold-reason" className={styles.fieldBlock}>
            <label className={styles.selectRow}>
              Hold reason
              <select
                className={styles.select}
                value={form.holdReason}
                onChange={(e) =>
                  patch({ holdReason: e.target.value as FormState['holdReason'] })
                }
              >
                {HOLD_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {form.holdReason === 'OTHER' ? (
              <textarea
                className={styles.textInput}
                placeholder="Detail (required, 10-500 chars)"
                value={form.holdReasonDetail}
                onChange={(e) => patch({ holdReasonDetail: e.target.value })}
              />
            ) : null}
            <label className={styles.selectRow}>
              Review by (informational only)
              <input
                type="date"
                className={styles.textInput}
                value={form.reviewBy}
                onChange={(e) => patch({ reviewBy: e.target.value })}
              />
            </label>
          </div>
        );
      case 'ESCALATE_TO_SUPERVISOR':
        return (
          <div data-testid="field-escalation-reason" className={styles.fieldBlock}>
            <label className={styles.selectRow}>
              Escalation reason
              <select
                className={styles.select}
                value={form.escalationReason}
                onChange={(e) =>
                  patch({ escalationReason: e.target.value as FormState['escalationReason'] })
                }
              >
                {ESCALATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {form.escalationReason === 'OTHER' ? (
              <textarea
                className={styles.textInput}
                placeholder="Detail (required, 10-500 chars)"
                value={form.escalationReasonDetail}
                onChange={(e) => patch({ escalationReasonDetail: e.target.value })}
              />
            ) : null}
            <label className={styles.selectRow}>
              Escalate to (optional supervisor user id)
              <input
                type="text"
                className={styles.textInput}
                value={form.escalateTo}
                onChange={(e) => patch({ escalateTo: e.target.value })}
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  }
}
