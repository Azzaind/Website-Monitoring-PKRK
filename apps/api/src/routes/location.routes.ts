import { Router } from "express";
import { receiveLocations } from "../controllers/location.controller";
import { authenticateDevice } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticateDevice, receiveLocations);

export default router;