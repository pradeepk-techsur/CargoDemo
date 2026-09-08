/**
 * SPA fallback, registered LAST so /api/* always wins.
 *
 * The single not-found handler branches: an unmatched /api path is the
 * RESOURCE_NOT_FOUND envelope (via the error mapper's helper); every other path
 * is the client bundle when built, or a 200 text/plain
 * "CargoDemo API is running; client bundle not built" when it is not. A blank 200
 * and a 500 are both worse than a plain sentence. Wave 4 builds into dist/client.
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

import { sendApiNotFound } from './errorMapper.js';

const CLIENT_DIR = resolve(process.cwd(), 'dist/client');
const INDEX_HTML = join(CLIENT_DIR, 'index.html');

const NOT_BUILT_NOTICE = 'CargoDemo API is running; client bundle not built';

export async function registerSpa(app: FastifyInstance): Promise<void> {
  const bundlePresent = existsSync(INDEX_HTML);

  if (bundlePresent) {
    await app.register(fastifyStatic, { root: CLIENT_DIR, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) {
        sendApiNotFound(req, reply);
        return;
      }
      reply.type('text/html').sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) {
        sendApiNotFound(req, reply);
        return;
      }
      reply.code(200).type('text/plain').send(NOT_BUILT_NOTICE);
    });
  }
}
