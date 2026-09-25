import { asyncRoute } from "../utils/asyncRoute.js";
import { getServiceTypes } from "../models/serviceModel.js";

export const listServiceTypes = asyncRoute(async (req, res) => {
  const data = await getServiceTypes();
  res.json({ success: true, count: data.length, data });
});