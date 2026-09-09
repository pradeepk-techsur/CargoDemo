import { Routes, Route, Link } from 'react-router-dom';

import { AppShell } from './components/AppShell';
import { QUEUE_PATH } from './routes';
import { QueueScreen } from './screens/queue/QueueScreen';
import { ReviewScreen } from './screens/review/ReviewScreen';

/**
 * The whole navigation surface of the application: exactly two routes plus the
 * inline not-found. The queue is the ROOT route; the review screen is reached by
 * clicking a queue row. The route strings match REVIEW_PATH_PATTERN/QUEUE_PATH in
 * routes.ts (`/` and `/shipments/:shipmentId`).
 *
 * AppShell wraps the whole route table rather than each element, so the USWDS
 * banner and the DHS CBP / Cargo Directorate header render identically on every
 * page — including the not-found — and are never remounted on navigation.
 */
export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<QueueScreen />} />
        <Route path="/shipments/:shipmentId" element={<ReviewScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

function NotFound() {
  return (
    <main className="app-shell" data-testid="not-found">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link to={QUEUE_PATH} className="usa-button usa-button--outline">
        Back to queue
      </Link>
    </main>
  );
}
