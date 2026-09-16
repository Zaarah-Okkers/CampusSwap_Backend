// callbacks for the login page
import {
  getUserByEmail,
  CreateUser,
  getUserById,
  updatePassword,
} from "../model/login_db.js";

export const handlelogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    if (role && user.role !== role) {
      return res
        .status(403)
        .json({ message: `Account is not registered as ${role}` });
    }

    const { password_hash, ...userPayload } = user;

    res.status(200).json({ message: "Login successful ;)", user: userPayload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// this is for the registration

export const register = async (req, res) => {
  try {
    const userId = await CreateUser(req.body);
    res.status(201).json({ message: "user registered successfully", userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// the password change section
export const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    // Validation
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    // Fetch user
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password (plain text for now — will hash later)
    if (user.password_hash !== currentPassword) {
      return res.status(401).json({ error: "Incorrect crediantials" });
    }

    // Update
    await updatePassword(userId, newPassword);

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
