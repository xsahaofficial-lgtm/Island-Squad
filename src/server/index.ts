import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api.ts';
import { forms } from './routes/forms.ts';
import { menu } from './routes/menu.ts';
import { paymentRoutes } from './routes/payments.ts';
import { triggers } from './routes/triggers.ts';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/form', forms);
internal.route('/payments', paymentRoutes);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
