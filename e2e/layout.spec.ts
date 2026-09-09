/**
 * Layout regression guard.
 *
 * The queue's Priority cell has twice overflowed its column and painted its
 * derivation text across Status, Age and Value — once from an `inline-flex`
 * `white-space: nowrap` interaction, and again when a table component class
 * (`usa-table-container--scrollable`) silently applied `white-space: nowrap` to
 * every cell. Both were invisible to element-rect checks, because a shrunken
 * flex item keeps its BOX inside the cell while its TEXT paints outside it.
 *
 * So this measures glyphs, not boxes: it walks the text nodes of every cell and
 * uses Range geometry, which reflects where text actually lands. It also asserts
 * the page needs no horizontal scrolling at desktop widths — the table has its
 * own scroll region for that, and the document acquiring one means a fixed width
 * has escaped its container.
 *
 * Nodes hidden by `visually-hidden` are skipped: Range geometry cannot see
 * `clip`, so screen-reader-only text would otherwise read as an overflow.
 */

import { test, expect } from '@playwright/test';

interface Overflow {
  cell: string;
  text: string;
  overflowRight: number;
}

const ROUTES: Array<[string, string]> = [
  ['queue', '/'],
  ['review', '/shipments/SHP-2026-0007'],
];

// The narrowest common laptop, a mid desktop, and a wide monitor.
const WIDTHS = [1280, 1440, 1920];

for (const width of WIDTHS) {
  for (const [name, path] of ROUTES) {
    test(`${name} @ ${width}: no cell text escapes its column, no page h-scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });

      const overflows: Overflow[] = await page.evaluate(() => {
        const out: Overflow[] = [];
        const TOLERANCE = 1.0; // sub-pixel rounding

        const hidden = (el: Element | null): boolean => {
          for (let n = el; n; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.clip === 'rect(0px, 0px, 0px, 0px)') return true;
            if (cs.visibility === 'hidden' || cs.display === 'none') return true;
            if (n.classList.contains('visually-hidden')) return true;
          }
          return false;
        };

        for (const cell of Array.from(document.querySelectorAll('td, th'))) {
          if (hidden(cell)) continue;
          const rect = cell.getBoundingClientRect();
          const limit =
            rect.right - (parseFloat(getComputedStyle(cell).paddingRight) || 0);

          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = (node.textContent ?? '').trim();
            if (!text || hidden(node.parentElement)) continue;

            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of Array.from(range.getClientRects())) {
              if (r.width === 0 || r.height === 0) continue;
              const over = r.right - limit;
              if (over > TOLERANCE) {
                out.push({
                  cell:
                    (cell as HTMLElement).dataset.testid ??
                    (cell.className || cell.tagName),
                  text: text.slice(0, 60),
                  overflowRight: Math.round(over * 10) / 10,
                });
              }
            }
            range.detach();
          }
        }
        return out;
      });

      expect(
        overflows,
        overflows
          .map((o) => `[${o.cell}] +${o.overflowRight}px :: "${o.text}"`)
          .join('\n'),
      ).toEqual([]);

      const scroll = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        scroll.scrollWidth,
        `the document acquired a horizontal scrollbar (${scroll.scrollWidth} > ${scroll.clientWidth}); the table owns the only intended h-scroll region`,
      ).toBeLessThanOrEqual(scroll.clientWidth + 1);
    });
  }
}
