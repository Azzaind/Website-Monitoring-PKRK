import { Router } from "express";
import { getReadingHistory } from "../controllers/history.controller";
import { authenticateAdmin } from "../middleware/auth-admin.middleware";

const router = Router();

router.get("/", authenticateAdmin, getReadingHistory);

export default router;