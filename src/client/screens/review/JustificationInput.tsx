/**
 * The control that makes the decision the human's. Empty on arrival, ALWAYS. No
 * template, no placeholder text that could be submitted, and no
 * suggest-a-justification affordance anywhere.
 *
 * `min` is `justification_min_length` from the server's available-actions
 * projection for the selected action — one source of truth, never a hard-coded
 * value in the client.
 */

import { useId, useState } from 'react';

import styles from './Review.module.css';

export function JustificationInput(props: {
  value: string;
  min: number;
  onChange: (value: string) => void;
}): JSX.Element {
  const counterId = useId();
  const [blurred, setBlurred] = useState(false);
  const under = props.value.trim().length < props.min;

  return (
    <div className={styles.justificationBlock}>
      <label className={styles.justificationLabel} htmlFor="justification">
        Justification
      </label>
      <textarea
        id="justification"
        className={styles.justificationTextarea}
        data-testid="justification-input"
        aria-required="true"
        aria-describedby={counterId}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={() => setBlurred(true)}
        rows={4}
      />
      <div
        id={counterId}
        className={styles.justificationCounter}
        data-testid="justification-counter"
        aria-live="off"
      >
        {props.value.trim().length} / {props.min} minimum
      </div>
      {blurred && under ? (
        <div className={styles.justificationError} role="alert">
          Justification must be at least {props.min} characters.
        </div>
      ) : null}
      <p className={styles.standingNote}>
        Write your own reasoning. This text is recorded verbatim under your name.
      </p>
    </div>
  );
}
