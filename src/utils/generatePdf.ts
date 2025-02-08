
import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import { Response } from "express";
import path from "path";

const daysOfWeekHebrew: { [key: string]: string } = {
    Sunday: "ראשון",
    Monday: "    שני",
    Tuesday: "שלישי",
    Wednesday: " רביעי",
    Thursday: "חמישי",
    Friday: " שישי",
    Saturday: "  שבת",
  };
  
  
export const generateAttendancePdf = (month: string, res: Response) => {
  const selectedDate = dayjs(month);
  console.log(selectedDate);
  const startDate = selectedDate.subtract(1, "month").date(26);
  const endDate = selectedDate.date(25);
  const reportData = [];

  let currentDate = startDate;

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    const gregorianDate = currentDate.format("DD/MM/YYYY");
    const dayOfWeekEnglish = currentDate.format("dddd");
    const dayOfWeekHebrew = daysOfWeekHebrew[dayOfWeekEnglish];

    if (dayOfWeekHebrew.trim() !== "שישי" && dayOfWeekHebrew.trim() !== "שבת") {
      reportData.push({
        gregorianDate,
        dayOfWeekHebrew,
        attendanceText: "",
      });
    }

    currentDate = currentDate.add(1, "day");
  }

  const doc = new PDFDocument({ lang: "he", margin: 40 });
  const fontPath = path.join(__dirname, "../fonts/Alef-Regular.ttf");
  doc.font(fontPath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance_report.pdf"');
  doc.pipe(res);
  const revDate= selectedDate.format("MM-YYYY");
  console.log(revDate);

  doc
  .fontSize(14)
  .text("דוח נוכחות לחודש ", 350,50,{
    align: "right",
    features: ["rtla"],
    continued: true,
  })
  .text(`${revDate}`, 245,50,{
    align: "right",
  })
  .moveDown(0.5);

  doc
    .fontSize(10)
    .text("שם המפעיל: ____________________", { align: "right", features: ["rtla"] })
    .moveDown(0.5)
    .text("תעודת זהות: ____________________", { align: "right", features: ["rtla"] });
  
    const startY = 135;
  doc
    .fontSize(10)
    .text("תאריך לועזי", 490, startY, { features: ["rtla"], underline: true })
    .text("יום בשבוע", 400, startY, { features: ["rtla"], underline: true })
    .text("נוכחות- סמלים", 295, startY, { features: ["rtla"], underline: true });

  let y = startY + 22; 
  const rowHeight = 25; 

  reportData.forEach((row, index) => {
    const isThursday = row.dayOfWeekHebrew.trim() === "חמישי";

    doc
      .fontSize(10)
      .text(row.gregorianDate, 485, y)
      .text(row.dayOfWeekHebrew, 415, y)
      .text(row.attendanceText, 350, y);

    doc
      .moveTo(50, y + rowHeight - 5)
      .lineTo(550, y + rowHeight - 5)
      .lineWidth(0.5)
      .strokeColor("#CCCCCC")
      .stroke();

    if (isThursday && index !== reportData.length - 1) {
      doc
        .moveTo(50, y + rowHeight - 5)
        .lineTo(550, y + rowHeight - 5)
        .lineWidth(1.2)
        .strokeColor("#000000")
        .stroke();
    }

    y += rowHeight;
  });

  doc.lineWidth(0.5).moveTo(463, 135).lineTo(463, y).stroke();
  doc.lineWidth(0.5).moveTo(380, 135).lineTo(380, y).stroke();
  doc.end();
};

