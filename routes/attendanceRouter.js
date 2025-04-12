import express from "express";
import { addAttendance } from "../controllers/attendanceController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware(["teacher"]), addAttendance);

export default router;