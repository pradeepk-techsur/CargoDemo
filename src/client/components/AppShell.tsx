/**
 * The application shell: USWDS government banner, the branded header, and the
 * identifier footer. Every route renders inside it, so the DHS CBP / Cargo
 * Directorate lockup is present on the queue, the review screen, and the
 * not-found page alike.
 *
 * The lockup sits at the top-left per the USWDS header standard, and is a link
 * home — the conventional behaviour for an agency mark. The two marks are
 * `alt=""` because the adjacent wordmark already carries the agency name as text:
 * giving them alt text would announce the same organisation three times. See
 * public/branding/README.md for swapping in the authorised artwork.
 *
 * The shell renders NO navigation. The app has exactly two routes and the review
 * screen is reachable only by activating a queue row, so a nav bar would be an
 * empty affordance. This is a deliberately minimal shell, not the full F16 shell
 * (deferred by the recorded scope decision).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { QUEUE_PATH } from '../routes';
import { GovBanner } from './GovBanner';
import styles from './AppShell.module.css';

/**
 * Served from Vite's publicDir (src/client/public), so these are verbatim,
 * un-fingerprinted paths: replacing the file on disk swaps the mark with no code
 * change. Change the extension here if the authorised artwork is not SVG.
 */
const LOGOS = {
  agency: {
    src: '/branding/dhs-cbp.svg',
    testId: 'logo-dhs-cbp',
  },
  directorate: {
    src: '/branding/cargo-directorate.svg',
    testId: 'logo-cargo-directorate',
  },
} as const;

export function AppShell(props: { children: ReactNode }): JSX.Element {
  return (
    <div className={styles.shell}>
      {/* USWDS skip link — the first focusable element in the document. */}
      <a className="usa-skipnav" href="#main-content">
        Skip to main content
      </a>

      <GovBanner />

      <header
        className={`usa-header usa-header--basic ${styles.header}`}
        data-testid="app-header"
      >
        <div className={styles.headerInner}>
          <div className={`usa-logo ${styles.logo}`}>
            <Link to={QUEUE_PATH} className={styles.lockup} data-testid="header-home-link">
              <span className={styles.marks}>
                <img
                  className={styles.mark}
                  src={LOGOS.agency.src}
                  alt=""
                  data-testid={LOGOS.agency.testId}
                />
                <img
                  className={styles.mark}
                  src={LOGOS.directorate.src}
                  alt=""
                  data-testid={LOGOS.directorate.testId}
                />
              </span>
              <span className={styles.wordmark}>
                <span className={styles.agencyName}>
                  U.S. Customs and Border Protection
                </span>
                <span className={styles.directorateName}>Cargo Directorate</span>
              </span>
            </Link>
          </div>

          <div className={styles.headerMeta}>
            <span className={styles.appTitle}>Cargo Exception Handling</span>
            <span
              className={`usa-tag ${styles.demoTag}`}
              data-testid="demo-mode-tag"
              title="Synthetic data. Not connected to ACE or any system of record."
            >
              Demonstration
            </span>
          </div>
        </div>
      </header>

      <div id="main-content" className={styles.main}>
        {props.children}
      </div>

      <footer className={styles.footer} data-testid="app-footer">
        <div className={styles.footerInner}>
          <p className={styles.footerText}>
            <strong>CargoDemo</strong> — a demonstration application. Shipments,
            importers, documents, and decisions are synthetic. Not connected to ACE
            or any system of record.
          </p>
          <p className={styles.footerText}>
            Built to the U.S. Web Design System.
          </p>
        </div>
      </footer>
    </div>
  );
}
