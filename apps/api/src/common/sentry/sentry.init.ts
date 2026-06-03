/**
 * Sentry initialization for the API.
 *
 * Behavior:
 *   - No SENTRY_DSN env → no-op, returns null. Sentry calls elsewhere become no-ops.
 *   - DSN set + @sentry/node installed → initialized with environment + release tags.
 *   - DSN set + package missing → warns once and returns null. Production stays up.
 *
 * Why dynamic require: keeps Sentry an optional runtime dependency so the app
 * runs without it (dev, fresh checkouts, partial deploys).
 */

let sentryRef: any = null;
let initialized = false;

export function initSentry(): any | null {
  if (initialized) return sentryRef;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Silent: most local dev runs don't have Sentry configured.
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || `totalstore-api@${process.env.npm_package_version || '1.0.0'}`,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      // Don't capture noisy expected errors
      ignoreErrors: [
        /Throttler.*ThrottlerException/,
        /class-validator/,
        'ValidationError',
      ],
      beforeSend(event: any) {
        // Strip Authorization headers and cookies from breadcrumbs
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
    });
    sentryRef = Sentry;
    // eslint-disable-next-line no-console
    console.log(`[Sentry] initialized (env=${process.env.NODE_ENV || 'development'})`);
    return Sentry;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Sentry] DSN set but @sentry/node is not installed. ` +
      `Install with "npm install @sentry/node" in apps/api. Continuing without error tracking.`,
    );
    return null;
  }
}

export function captureException(err: unknown, context?: Record<string, any>) {
  if (!sentryRef) return;
  try {
    if (context) {
      sentryRef.withScope((scope: any) => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        sentryRef.captureException(err);
      });
    } else {
      sentryRef.captureException(err);
    }
  } catch {
    // never crash the app over Sentry
  }
}
