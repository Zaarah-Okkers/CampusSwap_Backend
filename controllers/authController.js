import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { asyncRoute } from "../utils/asyncRoute.js";
import { normalizeRole, VALID_ROLES } from "../utils/roles.js";
import { userPayload } from "../utils/userPayload.js";
import { sessions } from "../utils/sessions.js";
import {
  findUserByEmail,
  findUserById,
  findUniversityByName,
  insertUser,
  insertProviderProfile,
  updatePasswordHash,
} from "../models/authModel.js";

export const login = asyncRoute(async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required" });

  const user = await findUserByEmail(email);
  if (!user || user.is_banned)
    return res.status(401).json({ message: "Invalid credentials" });

  // Seed passwords start as plaintext; the first successful login
  // upgrades them to bcrypt.
  const valid = user.password_hash?.startsWith("$2")
    ? await bcrypt.compare(password, user.password_hash)
    : user.password_hash === password;
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const expectedRole = normalizeRole(role);
  if (role && user.role !== expectedRole)
    return res
      .status(403)
      .json({ message: "Account role does not match selected role" });

  if (!user.password_hash.startsWith("$2"))
    await updatePasswordHash(user.id, await bcrypt.hash(password, 12));

  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  res.json({ message: "Login successful", token, user: userPayload(user) });
});

export const register = asyncRoute(async (req, res) => {
  const body = req.body || {};
  const fullName = body.full_name || body.fullName;
  const email = body.email;
  const password = body.password || body.password_hash;
  const role = normalizeRole(body.role);

  if (!fullName || !email || !password)
    return res
      .status(400)
      .json({ error: "fullName, email and password are required" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const hash = await bcrypt.hash(password, 12);

  // Optional university — students and res managers pass a name.
  const universityName = body.university || null;
  let universityId = null;
  if (universityName) {
    const uni = await findUniversityByName(universityName);
    universityId = uni?.id || null;
  }

  try {
    const userId = await insertUser({
      fullName,
      email,
      passwordHash: hash,
      role,
      studentNumber: body.studentNumber || body.student_number || null,
      universityId,
    });

    // Providers need a profile row immediately so they appear on SafeHome.
    if (role === "service_provider") {
      const rawService = (body.service_type || body.serviceType || "").trim();
      const canonical = rawService
        ? rawService.charAt(0).toUpperCase() +
          rawService.slice(1).toLowerCase()
        : "Handyman";

      await insertProviderProfile({
        userId,
        businessName: body.business_name || fullName,
        serviceType: canonical,
        bio: body.bio || "New service provider on CampusSwap.",
        location: body.service_area || "Cape Town",
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      userId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Email is already registered" });
    throw error;
  }
});

export const changePassword = asyncRoute(async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body || {};
  if (!userId || !currentPassword || !newPassword)
    return res.status(400).json({ error: "All fields are required" });

  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = user.password_hash.startsWith("$2")
    ? await bcrypt.compare(currentPassword, user.password_hash)
    : user.password_hash === currentPassword;
  if (!valid) return res.status(401).json({ error: "Incorrect credentials" });

  await updatePasswordHash(userId, await bcrypt.hash(newPassword, 12));
  res.json({ message: "Password updated successfully" });
});