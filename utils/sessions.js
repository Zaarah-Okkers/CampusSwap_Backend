// Bearer-token → userId store. In-memory only — fine for a course project.
// Login writes to it; auth middleware (future) would read from it.
export const sessions = new Map();