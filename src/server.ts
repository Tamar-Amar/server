import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import institutionRoutes from './routes/institutionRoutes';
import classRoutes from './routes/classRoutes';
import storeRoutes from './routes/storeRoutes';
import activityRoutes from './routes/activityRoutes';
import operatorRoutes from './routes/operatorRoutes';
import cors from 'cors';
import purchaseRoutes from './routes/purchaseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import Operator from './models/Operator';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import authRoutes from './routes/authRoutes';


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());


connectDB();

app.use('/api/institutions', institutionRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/activities', activityRoutes);
app.use("/api/operators", operatorRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);

const path = require('path');

const daysOfWeekHebrew: { [key: string]: string } = {
  Sunday: "ראשון",
  Monday: "    שני",
  Tuesday: "שלישי",
  Wednesday: " רביעי",
  Thursday: "חמישי",
  Friday: " שישי",
  Saturday: "  שבת",
};

// יצירת PDF ושליחתו ללקוח
app.post("/api/generate-pdf", (req, res) => {
  const { month } = req.body;
  const fonts = {
    regular: "../src/fonts/Alef-Regular.ttf",
  };
  const selectedDate = dayjs(month);
  const startDate = selectedDate.subtract(1, "month").date(26);
  const endDate = selectedDate.date(25);
  const reportData = [];
  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    const gregorianDate = currentDate.format("DD/MM/YYYY");
    const dayOfWeekEnglish = currentDate.format("dddd");
    const dayOfWeekHebrew = daysOfWeekHebrew[dayOfWeekEnglish];
    reportData.push({
      gregorianDate,
      dayOfWeekHebrew,
      attendanceText: "",
    });
    currentDate = currentDate.add(1, "day");
  }

  const doc = new PDFDocument({ lang: "he", margin: 40 });
  const fontPath = path.join(__dirname, "../src/fonts/Alef-Regular.ttf");
  doc.font(fontPath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="attendance_report.pdf"'
  );
  doc.pipe(res);
  doc
    .fontSize(14)
    .text(`דוח נוכחות לחודש 5202-10`, {
      align: "right",
      features: ['rtla'], 
    })
    .moveDown(0.5);
  doc
    .fontSize(10)
    .text("שם המפעיל:   _______________________   תעודת זהות: _________________", { align: "right", features: ['rtla'] })


  const  startY=105;
  doc
    .fontSize(10)
    .text("תאריך לועזי", 490, startY, { features: ['rtla'], underline: true })
    .text("יום בשבוע", 400, startY, { features: ['rtla'], underline: true})
    .text("נוכחות- סמלים", 295, startY , { features: ['rtla'], underline: true});

    let y=startY + 20;
    const rowHeight = 20; 
  reportData.forEach((row) => {
    const attendanceText = row.dayOfWeekHebrew.trim() === "שישי" || row.dayOfWeekHebrew.trim() === "שבת" 
    ? "-" 
    : " ";

    doc
      .fontSize(10)
      .text(row.gregorianDate, 485, y)
      .text(row.dayOfWeekHebrew, 415, y)
      .text(attendanceText, 350, y)

    doc
    .moveTo(50, y + 16)
    .lineTo(550, y + 16)
    .lineWidth(0.5)
    .strokeColor('#CCCCCC') 
    .stroke();
      y += rowHeight;
  });

  doc.lineWidth(0.5).moveTo(463, 125).lineTo(463, 743).stroke();
  doc.lineWidth(0.5).moveTo(380, 125).lineTo(380, 743).stroke();
  doc.end();
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(errorHandler);

//listen to the port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
