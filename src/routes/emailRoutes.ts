import express from "express";
import { sendEmailController, sendPdfController } from "../controllers/emailController";

const router = express.Router();

router.post("/send", sendEmailController);

router.post("/send-attendance-pdf", sendPdfController);

export default router;
