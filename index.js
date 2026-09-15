import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// the pages imports
import { db } from './config/home_config.js';
import loginRouter from "./routers/loginRouter.js";
import dashboardsRouter from "./routers/dashboardsRouter.js";
import homeRouter from "./routers/homeRouter.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
 
// the api 
app.use("/api/auth", loginRouter);
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/home", homeRouter);







app.listen (2026,() => {
  console.log("Server is running on http://localhost:2026");
});

// my workflow 
// 1. model
// 2. controller
// 3. routers
// finally the index.js page