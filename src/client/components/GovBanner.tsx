/// <reference types="vite/client" />

/**
 * The USWDS official-government-website banner.
 *
 * Markup follows the USWDS `usa-banner` contract exactly, but the disclosure is
 * driven by React state rather than by the USWDS JavaScript bundle: USWDS's
 * accordion behaviour attaches to the DOM on load and mutates the same nodes
 * React owns, and the two cannot both be authoritative. Collapse is the `hidden`
 * attribute (USWDS sets no `display` on `.usa-accordion__content`, so the UA
 * `[hidden] { display: none }` rule governs it) plus the
 * `usa-banner__header--expanded` modifier, which is precisely what the USWDS JS
 * would toggle.
 *
 * The flag and guidance icons are imported through the package's `exports` map
 * ("./img/*"), so Vite fingerprints and emits them as build assets instead of the
 * app carrying its own copies.
 */

import { useId, useState } from 'react';

import flagSmall from '@uswds/uswds/img/us_flag_small.png';
import iconDotGov from '@uswds/uswds/img/icon-dot-gov.svg';
import iconHttps from '@uswds/uswds/img/icon-https.svg';

export function GovBanner(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <section
      className="usa-banner"
      aria-label="Official website of the United States government"
      data-testid="gov-banner"
    >
      <div className="usa-accordion">
        <header
          className={`usa-banner__header${
            expanded ? ' usa-banner__header--expanded' : ''
          }`}
        >
          <div className="usa-banner__inner">
            <div className="grid-col-auto">
              <img
                aria-hidden="true"
                className="usa-banner__header-flag"
                src={flagSmall}
                alt=""
              />
            </div>
            <div className="grid-col-fill tablet:grid-col-auto" aria-hidden="true">
              <p className="usa-banner__header-text">
                An official website of the United States government
              </p>
              <p className="usa-banner__header-action">Here&rsquo;s how you know</p>
            </div>
            <button
              type="button"
              className="usa-accordion__button usa-banner__button"
              aria-expanded={expanded}
              aria-controls={contentId}
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="usa-banner__button-text">Here&rsquo;s how you know</span>
            </button>
          </div>
        </header>

        <div
          className="usa-banner__content usa-accordion__content"
          id={contentId}
          hidden={!expanded}
        >
          <div className="grid-row grid-gap-lg">
            <div className="usa-banner__guidance tablet:grid-col-6">
              <img
                className="usa-banner__icon usa-media-block__img"
                src={iconDotGov}
                role="img"
                alt=""
                aria-hidden="true"
              />
              <div className="usa-media-block__body">
                <p>
                  <strong>Official websites use .gov</strong>
                  <br />A <strong>.gov</strong> website belongs to an official
                  government organization in the United States.
                </p>
              </div>
            </div>
            <div className="usa-banner__guidance tablet:grid-col-6">
              <img
                className="usa-banner__icon usa-media-block__img"
                src={iconHttps}
                role="img"
                alt=""
                aria-hidden="true"
              />
              <div className="usa-media-block__body">
                <p>
                  <strong>Secure .gov websites use HTTPS</strong>
                  <br />A <strong>lock</strong> or <strong>https://</strong> means
                  you&rsquo;ve safely connected to the .gov website. Share sensitive
                  information only on official, secure websites.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
