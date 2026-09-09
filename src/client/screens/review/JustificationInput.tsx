/**
 * The control that makes the decision the human's. Empty on arrival, ALWAYS. No
 * template, no placeholder text that could be submitted, and no
 * suggest-a-justification affordance anywhere.
 *
 * `min` is `justification_min_length` from the server's available-actions
 * projection for the selected action — one source of truth, never a hard-coded
 * value in the client.
 *
 * Built from the USWDS form pattern: `usa-label` / `usa-textarea` / `usa-hint`,
 * and on a short entry the whole group takes `usa-form-group--error` with a
 * `usa-error-message`, which is how USWDS signals an invalid field.
 */

import { useId, useState } from 'react';

import styles from './Review.module.css';

export function JustificationInput(props: {
  value: string;
  min: number;
  onChange: (value: string) => void;
}): JSX.Element {
  const counterId = useId();
  const errorId = useId();
  const [blurred, setBlurred] = useState(false);
  const under = props.value.trim().length < props.min;
  const showError = blurred && under;

  return (
    <div
      className={`usa-form-group ${showError ? 'usa-form-group--error' : ''} ${
        styles.justificationBlock
      }`}
    >
      <label className="usa-label" htmlFor="justification">
        Justification
      </label>
      <span className="usa-hint" id={counterId} data-testid="justification-counter">
        {props.value.trim().length} / {props.min} minimum
      </span>
      {showError ? (
        <span className="usa-error-message" id={errorId} role="alert">
          Justification must be at least {props.min} characters.
        </span>
      ) : null}
      <textarea
        id="justification"
        className={`usa-textarea ${showError ? 'usa-input--error' : ''}`}
        data-testid="justification-input"
        aria-required="true"
        aria-describedby={showError ? `${counterId} ${errorId}` : counterId}
        aria-invalid={showError || undefined}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={() => setBlurred(true)}
        rows={4}
      />
      <p className={styles.standingNote}>
        Write your own reasoning. This text is recorded verbatim under your name.
      </p>
    </div>
  );
}
