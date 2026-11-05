import { Router } from "express";
import { getReadingHistory } from "../controllers/history.controller";

const router = Router();

router.get("/", getReadingHistory);

export default router;