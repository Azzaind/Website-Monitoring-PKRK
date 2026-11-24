import { Router } from "express";
import { getReadingHistory } from "../controllers/history.controller";
import { optionalAdmin } from "../middleware/optional-admin.middleware";

const router = Router();
router.get("/", optionalAdmin, getReadingHistory);
export default router;
