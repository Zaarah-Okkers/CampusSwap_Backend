import { asyncRoute } from "../utils/asyncRoute.js";
import { userPayload } from "../utils/userPayload.js";
import {
  getStudentDashboard,
  getProviderDashboard,
  getResManagerDashboard,
} from "../models/dashboardModel.js";

export const studentDashboard = asyncRoute(async (req, res) => {
  const { user, mylistings, myOrders } = await getStudentDashboard(
    req.params.id,
  );
  res.json({ user: userPayload(user), mylistings, myOrders });
});

export const providerDashboard = asyncRoute(async (req, res) => {
  const { jobs } = await getProviderDashboard(req.params.id);
  res.json({ jobs });
});

export const resManagerDashboard = asyncRoute(async (req, res) => {
  const data = await getResManagerDashboard();
  res.json(data);
});
