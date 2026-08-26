// Minimal structured logger: one JSON object per line, so logs are greppable
// and safe to feed into a log aggregator (Render logs, Datadog, etc.) without
// a new dependency. Replaces ad-hoc console.log(label, hugeObject) calls.
//
// Usage: logger.info('event_name', { key: value }) / logger.error('event_name', { err })
// Never pass req.headers or anything containing an Authorization token -- use
// redactHeaders() below if headers are genuinely needed for debugging.

const LEVELS = ['error', 'warn', 'info', 'debug'];
const currentLevel = LEVELS.includes(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'info';
const currentLevelIdx = LEVELS.indexOf(currentLevel);

function serializeError(err) {
  if (!err) return undefined;
  return {
    message: err.message,
    code: err.code,      // Postgres error code (e.g. 42P01 = undefined_table)
    detail: err.detail,  // Postgres often puts the useful part here
    stack: err.stack
  };
}

function write(level, event, fields = {}) {
  if (LEVELS.indexOf(level) > currentLevelIdx) return;
  const { err, error, ...rest } = fields;
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...rest
  };
  const e = err || error;
  if (e) payload.err = serializeError(e);
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

// Strips sensitive headers (Authorization, Cookie) -- use this instead of
// logging req.headers directly if you need header info for debugging.
function redactHeaders(headers = {}) {
  const { authorization, cookie, ...rest } = headers;
  return {
    ...rest,
    authorization: authorization ? '[REDACTED]' : undefined,
    cookie: cookie ? '[REDACTED]' : undefined
  };
}

module.exports = {
  error: (event, fields) => write('error', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  info: (event, fields) => write('info', event, fields),
  debug: (event, fields) => write('debug', event, fields),
  redactHeaders
};
