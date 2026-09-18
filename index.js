import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// the pages imports
import { db } from "./config/dhl_config.js";
import loginRouter from "./routers/loginRouters.js";
import dashboardsRouter from "./routers/dashboardsRouters.js";
import homeRouter from "./routers/homeRouters.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// the api
app.use("/api/auth", loginRouter);
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/home", homeRouter);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

// my workflow
// 1. model
// 2. controller
// 3. routers
// finally the index.js page

// my api this is for checking
// GET http://localhost:2026/api/home
// POST http://localhost:2026/api/auth/login
// POST http://localhost:2026/api/auth/register
// GET http://localhost:2026/api/dashboards/student/13
// GET http://localhost:2026/api/dashboards/admin
// GET http://localhost:2026/api/dashboards/res-manager
// GET http://localhost:2026/api/dashboards/provider/8
