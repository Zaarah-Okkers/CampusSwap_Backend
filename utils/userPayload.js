// Every endpoint that returns a user object must strip password_hash.
// This keeps that concern in exactly one place.
export const userPayload = (user) => {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return {
    ...safe,
    name: safe.full_name,
    university: safe.university_name || "",
  };
};