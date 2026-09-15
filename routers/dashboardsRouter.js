// here will be the imports 
import express from "express";
import { fetchStudentDashb, fetchAdminDash, fetchProviderDash, fetchResMgnerDash } from "../controller/dashboard_con.js";

const router = express.Router();

// here will be the routers for the dashboards:

// the student dashboards
// router.post("/student", fetchStudentDashb);

router.get("/student/:userId",  fetchStudentDashb);
router.get("/student", fetchStudentDashb);

// the res manager
// router.post("/res manager", fetchResMgnerDash);
router.get("/res manager",  fetchResMgnerDash);

// the admin
// router.post("/admin",  fetchAdminDash);
router.get("/admin",  fetchAdminDash);

// the provider 
// router.post("/provider", fetchProviderDash);
router.get("/provider/:providerId", fetchProviderDash);
router.get("/provider", fetchProviderDash);

export default router;