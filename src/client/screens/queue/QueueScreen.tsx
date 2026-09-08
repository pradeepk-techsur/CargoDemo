/**
 * The Cargo Exception Queue — the application's landing screen, mounted at the
 * root route.
 *
 * The QueueQuery lives in the URL search params, so a filtered view is shareable
 * and survives reload. Restored params are forwarded to the server VERBATIM: the
 * raw string values are grouped into arrays for the repeatable keys and the two
 * booleans / two integers are coerced by shape, but nothing is intersected with
 * the frozen enums. The server is the validator, and a value it rejects must
 * reach it in order to be rejected — a 422 renders the error panel, never
 * unfiltered data.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type {
  CaseStatus,
  ExceptionType,
  Priority,
  QueueQuery,
} from '../../../shared/api';
import { useQueue } from '../../api/hooks';
import { ErrorPanel, EmptyState, Skeleton } from '../../components/ui';
import {
  statusLabel,
  priorityLabel,
  exceptionTypeLabel,
} from '../../api/enums';
import { QueueFilters, type AppliedChip } from './QueueFilters';
import { QueueTable } from './QueueTable';
import styles from './Queue.module.css';

const DEFAULT_SORT = 'priority:desc,age:desc';
const DEFAULT_PAGE_SIZE = 25;

/** Read the QueueQuery out of the URL, forwarding values verbatim. */
function readQuery(params: URLSearchParams): {
  query: QueueQuery;
  sortField: string;
  sortDirection: 'asc' | 'desc';
} {
  const status = params.getAll('status') as CaseStatus[];
  const exception_type = params.getAll('exception_type') as ExceptionType[];
  const priority = params.getAll('priority') as Priority[];

  const includeCleanRaw = params.get('include_clean');
  const includeClearedRaw = params.get('include_cleared');
  const pageRaw = params.get('page');
  const pageSizeRaw = params.get('page_size');
  const sort = params.get('sort') ?? DEFAULT_SORT;

  const query: QueueQuery = {
    ...(status.length ? { status } : {}),
    ...(exception_type.length ? { exception_type } : {}),
    ...(priority.length ? { priority } : {}),
    ...(includeCleanRaw !== null ? { include_clean: includeCleanRaw === 'true' } : {}),
    ...(includeClearedRaw !== null
      ? { include_cleared: includeClearedRaw === 'true' }
      : {}),
    sort,
    page: pageRaw !== null ? Number(pageRaw) : 1,
    page_size: pageSizeRaw !== null ? Number(pageSizeRaw) : DEFAULT_PAGE_SIZE,
  };

  // Derive the sort field/direction for the controls from the first sort term.
  const firstTerm = sort.split(',')[0] ?? 'priority:desc';
  const [field = 'priority', dir = 'desc'] = firstTerm.split(':');
  const sortDirection: 'asc' | 'desc' = dir === 'asc' ? 'asc' : 'desc';

  return { query, sortField: field, sortDirection };
}

export function QueueScreen(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { query, sortField, sortDirection } = useMemo(
    () => readQuery(searchParams),
    [searchParams],
  );

  const result = useQueue(query);

  const hasAnyFilter =
    (query.status?.length ?? 0) > 0 ||
    (query.exception_type?.length ?? 0) > 0 ||
    (query.priority?.length ?? 0) > 0 ||
    query.include_clean === true ||
    query.include_cleared === true;

  // --- URL mutation helpers --------------------------------------------------

  function update(mutate: (p: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    // Any filter change returns to page 1.
    next.delete('page');
    setSearchParams(next);
  }

  function toggleMulti(key: string, value: string): void {
    update((p) => {
      const existing = p.getAll(key);
      p.delete(key);
      if (existing.includes(value)) {
        for (const v of existing) if (v !== value) p.append(key, v);
      } else {
        for (const v of existing) p.append(key, v);
        p.append(key, value);
      }
    });
  }

  function setBool(key: string, value: boolean): void {
    update((p) => {
      p.delete(key);
      if (value) p.set(key, 'true');
    });
  }

  function setSort(field: string, direction: 'asc' | 'desc'): void {
    update((p) => {
      p.set('sort', `${field}:${direction}`);
    });
  }

  function clearAll(): void {
    setSearchParams(new URLSearchParams());
  }

  // --- Applied chips (from the server's interpretation) ----------------------

  const appliedChips: AppliedChip[] = useMemo(() => {
    const chips: AppliedChip[] = [];
    const applied = result.data?.applied.filters as Record<string, unknown> | undefined;
    if (!applied) return chips;

    for (const s of (applied.status as CaseStatus[] | undefined) ?? []) {
      chips.push({
        key: `status:${s}`,
        label: `Status ${statusLabel(s)}`,
        onRemove: () => toggleMulti('status', s),
      });
    }
    for (const t of (applied.exception_type as ExceptionType[] | undefined) ?? []) {
      chips.push({
        key: `type:${t}`,
        label: `Exception ${exceptionTypeLabel(t)}`,
        onRemove: () => toggleMulti('exception_type', t),
      });
    }
    for (const p of (applied.priority as Priority[] | undefined) ?? []) {
      chips.push({
        key: `priority:${p}`,
        label: `Priority ${priorityLabel(p)}`,
        onRemove: () => toggleMulti('priority', p),
      });
    }
    if (applied.include_clean === true) {
      chips.push({
        key: 'include_clean',
        label: 'Including clean entries',
        onRemove: () => setBool('include_clean', false),
      });
    }
    if (applied.include_cleared === true) {
      chips.push({
        key: 'include_cleared',
        label: 'Including cleared cases',
        onRemove: () => setBool('include_cleared', false),
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.data, searchParams]);

  // --- Body ------------------------------------------------------------------

  let body: JSX.Element;
  if (result.isLoading) {
    body = (
      <div className={styles.tableWrap} data-testid="queue-loading" aria-busy="true">
        <Skeleton rows={8} height="3rem" />
      </div>
    );
  } else if (result.isError) {
    body = (
      <ErrorPanel
        error={result.error as never}
        onRetry={() => result.refetch()}
        testId="queue-error"
      >
        {hasAnyFilter ? (
          <p>
            <button
              type="button"
              className={styles.clearAll}
              data-testid="queue-clear-filters"
              onClick={clearAll}
            >
              Clear all filters
            </button>
          </p>
        ) : null}
      </ErrorPanel>
    );
  } else if (result.data && result.data.data.length === 0) {
    body = hasAnyFilter ? (
      <EmptyState
        testId="queue-empty"
        message="No shipments match these filters."
        action={
          <button
            type="button"
            className={styles.clearAll}
            data-testid="queue-clear-filters"
            onClick={clearAll}
          >
            Clear all filters
          </button>
        }
      />
    ) : (
      <EmptyState
        testId="queue-empty"
        message="No shipments are currently flagged. Clean entries stay off this queue."
      />
    );
  } else if (result.data) {
    const page = result.data.page;
    body = (
      <div className={styles.tableWrap}>
        <QueueTable
          rows={result.data.data}
          sortField={sortField}
          sortDirection={sortDirection}
        />
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={page.page <= 1}
            onClick={() =>
              update((p) => p.set('page', String(Math.max(1, page.page - 1))))
            }
          >
            Previous
          </button>
          <span>
            Page {page.page} of {page.total_pages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            disabled={page.page >= page.total_pages}
            onClick={() => update((p) => p.set('page', String(page.page + 1)))}
          >
            Next
          </button>
        </div>
      </div>
    );
  } else {
    body = <div />;
  }

  const total = result.data?.page.total ?? 0;
  const showing = result.data?.data.length ?? 0;

  return (
    <main className={styles.screen} data-testid="queue-screen">
      <header className={styles.header}>
        <h1>Cargo Exception Queue</h1>
        <p className={styles.resultCount} data-testid="queue-result-count">
          {total} flagged shipment{total === 1 ? '' : 's'} · showing {showing}
        </p>
      </header>
      <div className={styles.layout}>
        <QueueFilters
          query={query}
          sortField={sortField}
          sortDirection={sortDirection}
          appliedChips={appliedChips}
          hasAnyFilter={hasAnyFilter}
          onToggleStatus={(v) => toggleMulti('status', v)}
          onToggleExceptionType={(v) => toggleMulti('exception_type', v)}
          onTogglePriority={(v) => toggleMulti('priority', v)}
          onToggleIncludeClean={(v) => setBool('include_clean', v)}
          onToggleIncludeCleared={(v) => setBool('include_cleared', v)}
          onSortFieldChange={(v) => setSort(v, sortDirection)}
          onSortDirectionChange={(v) => setSort(sortField, v)}
          onClearAll={clearAll}
        />
        {body}
      </div>
    </main>
  );
}
