import { asyncRoute } from "../utils/asyncRoute.js";
import { getProviders } from "../models/serviceModel.js";

export const listProviders = asyncRoute(async (req, res) => {
  const { service = "", emergency = "" } = req.query;
  const data = await getProviders({ service, emergency });
  res.json({ success: true, count: data.length, data });
});