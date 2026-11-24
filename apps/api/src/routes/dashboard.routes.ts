import { Router } from "express";
import { getDashboardOverview } from "../controllers/dashboard.controller";
import { optionalAdmin } from "../middleware/optional-admin.middleware";

const router = Router();
router.get("/overview", optionalAdmin, getDashboardOverview);
export default router;
