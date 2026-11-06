import { Router } from "express";
import { checkGeofence } from "../controllers/geofence.controller";
import { configureGeofence } from "../controllers/geofence-config.controller";
import {
  getLatestLocations,
  getLocationHistory,
} from "../controllers/location-read.controller";
import { authenticateAdmin } from "../middleware/auth-admin.middleware";

const router = Router();

router.get("/latest", authenticateAdmin, getLatestLocations);
router.get("/history", authenticateAdmin, getLocationHistory);
router.get("/status", authenticateAdmin, checkGeofence);
router.patch("/geofence", authenticateAdmin, configureGeofence);

export default router;