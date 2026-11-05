import { Router } from "express";
import {
  exportReadingsExcel,
  exportReadingsCSV,
} from "../controllers/export.controller";
import { authenticateAdmin } from "../middleware/auth-admin.middleware";

const router = Router();

router.get("/excel", authenticateAdmin, exportReadingsExcel);
router.get("/csv", authenticateAdmin, exportReadingsCSV);

export default router;