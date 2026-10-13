/**
 * Validate req.body (or query) against a Zod schema, then REPLACE it with the
 * parsed result. Handlers only ever see clean, typed, trimmed data, and any
 * extra fields an attacker adds are dropped.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.parse(req[source]) // throws ZodError → error middleware → 400
  if (source === 'body') req.body = parsed
  else req.validatedQuery = parsed
  next()
}
