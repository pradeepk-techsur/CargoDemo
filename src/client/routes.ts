/// <reference types="vite/client" />

/**
 * The single source of both path strings in the application. Every `<Route path>`
 * and every `<Link to>` is written from these, so no route string is duplicated
 * and a link can never point at a path the router does not serve.
 *
 * There are exactly two routes plus an inline not-found. There is no /queue, no
 * /session, no /admin, no /notifications, no resolution route and no audit route:
 * those screens are deferred by the recorded scope decision.
 */

export const QUEUE_PATH = '/';
export const REVIEW_PATH_PATTERN = '/shipments/:shipmentId';

export function reviewPath(shipmentId: string): string {
  return '/shipments/' + encodeURIComponent(shipmentId);
}
