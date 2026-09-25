import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import safeHomeRoutes from "./routes/serviceRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import serviceTypeRoutes from "./routes/serviceTypeRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import residenceRoutes from "./routes/residenceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health + mount
//

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "campusswap-api" }),
);

app.get("/", (req, res) => res.json({ message: "CampusSwap API is running" }));

app.use("/api/services", safeHomeRoutes);
app.use("/api/service-types", serviceTypeRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);
app.use("/api", bookRoutes);
app.use("/api", residenceRoutes);
app.use("/api", adminRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", notificationRoutes);


// ============================
// FALLBACKS ============================

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
