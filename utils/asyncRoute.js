// Wraps an async route handler so any thrown error becomes a 500 JSON
// response instead of an unhandled promise rejection.
export const asyncRoute = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });