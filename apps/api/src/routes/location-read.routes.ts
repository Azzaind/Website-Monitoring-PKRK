import { Router } from "express";
import {
  getLatestLocations,
  getLocationHistory,
} from "../controllers/location-read.controller";
import { checkGeofence } from "../controllers/geofence.controller";
import { configureGeofence } from "../controllers/geofence-config.controller";
import { authenticateAdmin } from "../middleware/auth-admin.middleware";

const router = Router();

// Public access
router.get("/latest", getLatestLocations);
router.get("/history", getLocationHistory);
router.get("/status", checkGeofence);

// Admin access
router.patch("/geofence", authenticateAdmin, configureGeofence);

export default router;