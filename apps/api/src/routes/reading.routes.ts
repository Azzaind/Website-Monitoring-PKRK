
import { Router } from "express";
import { receiveReadings } from "../controllers/reading.controller";
import { authenticateDevice } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticateDevice, receiveReadings);

export default router;
