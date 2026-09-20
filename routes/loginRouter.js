// here will be the imports
import express from "express";
import {
  register,
  handlelogin,
  changePassword,
} from "../controllers/login_con.js";

// here will be the routers
const router = express.Router();

// user login
router.post("/login", handlelogin);

// new user sgin up
router.post("/register", register);

// changes the user password
router.post("/change-password", changePassword);

export default router;
