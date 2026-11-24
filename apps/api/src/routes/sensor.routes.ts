import { Router } from "express";
import { getSensors, getLatestReadings } from "../controllers/sensor.controller";
import { optionalAdmin } from "../middleware/optional-admin.middleware";

const router = Router();
router.get("/", optionalAdmin, getSensors);
router.get("/latest", optionalAdmin, getLatestReadings);
export default router;
