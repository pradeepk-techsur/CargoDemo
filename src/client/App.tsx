import { Routes, Route, Link } from 'react-router-dom';

import { QUEUE_PATH } from './routes';
import { QueueScreen } from './screens/queue/QueueScreen';

/**
 * The whole navigation surface of the application.
 *
 * The queue is the ROOT route: the preview URL with no path lands on it, with no
 * shell, no sidebar and no header nav. Task 3 adds `/shipments/:shipmentId` →
 * ReviewScreen above the catch-all. The application shell feature is deferred.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<QueueScreen />} />
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
