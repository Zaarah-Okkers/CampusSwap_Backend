// The UI uses "provider" and "resmanager" as short labels. The database
// ENUM uses underscored names. This is the single mapping point.
export const roleMap = {
  provider: "service_provider",
  resmanager: "res_manager",
  res_manager: "res_manager",
};

export const normalizeRole = (role) => roleMap[role] || role || "student";

export const VALID_ROLES = [
  "student",
  "service_provider",
  "admin",
  "res_manager",
];