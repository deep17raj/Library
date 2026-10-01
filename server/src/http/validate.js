/**
 * Parse req.body with a shared zod schema and replace it with the clean value.
 * A ZodError reaches the error handler, which answers 422 with per-field messages.
 * @param {import("zod").ZodTypeAny} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
