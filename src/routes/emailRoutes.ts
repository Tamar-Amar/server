import express from "express";
import { sendEmailController, sendMultipleEmailsController, sendPdfController } from "../controllers/emailController";

const router = express.Router();

router.post("/send", sendEmailController);

router.post("/send-attendance-pdf", sendPdfController);

router.post("/send-multiple", sendMultipleEmailsController);

export default router;
