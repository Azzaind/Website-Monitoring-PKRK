import { Router } from "express";
import {
  getSensors,
  getLatestReadings,
} from "../controllers/sensor.controller";

const router = Router();

router.get("/", getSensors);
router.get("/latest", getLatestReadings);

export default router;