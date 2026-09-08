import { Routes, Route, Link } from 'react-router-dom';

import { QUEUE_PATH } from './routes';

/**
 * The whole navigation surface of the application.
 *
 * In this task only the catch-all is registered, so every path renders the
 * inline not-found. Task 2 adds `/` → QueueScreen and Task 3 adds
 * `/shipments/:shipmentId` → ReviewScreen above the catch-all. There is no shell,
 * no sidebar and no header nav — the application shell feature is deferred.
 */
export function App() {
  return (
    <Routes>
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
