import { Routes, Route, Link } from 'react-router-dom';

import { QUEUE_PATH } from './routes';
import { QueueScreen } from './screens/queue/QueueScreen';
import { ReviewScreen } from './screens/review/ReviewScreen';

/**
 * The whole navigation surface of the application: exactly two routes plus the
 * inline not-found. The queue is the ROOT route; the review screen is reached by
 * clicking a queue row. The route strings match REVIEW_PATH_PATTERN/QUEUE_PATH in
 * routes.ts (`/` and `/shipments/:shipmentId`). There is no shell, no sidebar and
 * no header nav — the application shell feature is deferred.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<QueueScreen />} />
      <Route path="/shipments/:shipmentId" element={<ReviewScreen />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <main className="app-shell" data-testid="not-found">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link to={QUEUE_PATH}>Back to queue</Link>
    </main>
  );
}
