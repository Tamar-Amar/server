
import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import { Response } from "express";
import path from "path";

const getStream = require("get-stream");
import { buffer } from 'node:stream/consumers';


const daysOfWeekHebrew: { [key: string]: string } = {
    Sunday: "ראשון",
    Monday: "    שני",
    Tuesday: "שלישי",
    Wednesday: " רביעי",
    Thursday: "חמישי",
    Friday: " שישי",
    Saturday: "  שבת",
  };


  interface Operator {
    firstName: string;
    lastName: string;
    id: string;
    weeklySchedule: {
      day: string;
      classes: string[];
    }[];
  }
  
  
  
// export const generateAttendancePdfBuffer2 = async (
//   month: string,
//   operator: Operator
// ): Promise<Buffer> => {
//   const selectedDate = dayjs(month);
//   const startDate = selectedDate.subtract(1, "month").date(26);
//   const endDate = selectedDate.date(25);
//   const reportData = [];

//   const scheduleMap: Record<string, string[]> = {};
//   console.log("operator", operator);
//   console.log("scheduleMap", scheduleMap);
//   console.log("weeklySchedule", operator.weeklySchedule);
//   operator.weeklySchedule.forEach((entry) => {
//     scheduleMap[entry.day.trim()] = entry.classes || [];
//   });

//   let currentDate = startDate;
//   const daysOfWeekHebrew: { [key: string]: string } = {
//     Sunday: "ראשון",
//     Monday: "שני",
//     Tuesday: "שלישי",
//     Wednesday: "רביעי",
//     Thursday: "חמישי",
//     Friday: "שישי",
//     Saturday: "שבת",
//   };

//   while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
//     const gregorianDate = currentDate.format("DD/MM/YYYY");
//     const dayOfWeekEnglish = currentDate.format("dddd");
//     const dayOfWeekHebrew = daysOfWeekHebrew[dayOfWeekEnglish];

//     if (dayOfWeekHebrew !== "שישי" && dayOfWeekHebrew !== "שבת") {
//       const classes = scheduleMap[dayOfWeekHebrew.trim()] || [];
//       const attendanceText = classes.join(", ");

//       reportData.push({
//         gregorianDate,
//         dayOfWeekHebrew,
//         attendanceText,
//       });
//     }

//     currentDate = currentDate.add(1, "day");
//   }

//   const doc = new PDFDocument({ lang: "he", margin: 40 });
//   const buffers: Uint8Array[] = [];

//   doc.on("data", (chunk) => buffers.push(chunk));
//   doc.on("end", () => {});

//   const fontPath = path.join(__dirname, "../fonts/Alef-Regular.ttf");
//   doc.font(fontPath);

//   const revDate = selectedDate.format("MM-YYYY");

//   doc.fontSize(14)
//     .text("דוח נוכחות לחודש ", 350, 50, { align: "right", features: ["rtla"], continued: true })
//     .text(`${revDate}`, 245, 50, { align: "right" })
//     .moveDown(0.5);

//   doc.fontSize(10)
//     .text(`שם המפעיל: ${operator.firstName} ${operator.lastName}`, { align: "right", features: ["rtla"] })
//     .moveDown(0.5)
//     .text(`תעודת זהות: ${operator.id}`, { align: "right", features: ["rtla"] });

//   const startY = 135;
//   let y = startY + 22;
//   const rowHeight = 25;

//   doc.fontSize(10)
//     .text("תאריך לועזי", 490, startY, { features: ["rtla"], underline: true })
//     .text("יום בשבוע", 400, startY, { features: ["rtla"], underline: true })
//     .text("נוכחות - סמלים", 290, startY, { features: ["rtla"], underline: true })
//     .text("האם בוצע / הערות", 130, startY, { features: ["rtla"], underline: true });

//   reportData.forEach((row, index) => {
//     const isThursday = row.dayOfWeekHebrew === "חמישי";

//     doc.fontSize(10)
//       .text(row.gregorianDate, 480, y, { width: 60, align: "right", features: ["rtla"] })
//       .text(row.dayOfWeekHebrew, 375, y, { width: 60, align: "right" })
//       .text(row.attendanceText, 215, y, { width: 150, align: "right" });

//     doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(0.5).strokeColor("#CCCCCC").stroke();

//     if (isThursday && index !== reportData.length - 1) {
//       doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(1.2).strokeColor("#000000").stroke();
//     }

//     y += rowHeight;
//   });

//   doc.lineWidth(0.5).moveTo(463, 135).lineTo(463, y).stroke();
//   doc.lineWidth(0.5).moveTo(380, 135).lineTo(380, y).stroke();

//   y += 15;

//   doc.fontSize(11)
//     .text(`סה"כ הפעלות בחודש: ____________________`, 200, y, { align: "right", features: ["rtla"] });

//   doc.end();

//   return await getStream.buffer(doc);
// };


export const generateAttendancePdfBuffer = async (
  month: string,
  operator: Operator
): Promise<Buffer> => {
  const selectedDate = dayjs(month);
  const startDate = selectedDate.subtract(1, "month").date(26);
  const endDate = selectedDate.date(25);
  const reportData = [];

  console.log("operator", operator);
  console.log("weeklySchedule", operator.weeklySchedule);

  const scheduleMap: Record<string, string[]> = {};
  operator.weeklySchedule.forEach((entry) => {
    scheduleMap[entry.day.trim()] = (entry.classes || []).map((c) => c.toString());
  });

  let currentDate = startDate;

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    const gregorianDate = currentDate.format("DD/MM/YYYY");
    const dayOfWeekEnglish = currentDate.format("dddd");
    const dayOfWeekHebrew = daysOfWeekHebrew[dayOfWeekEnglish];

    if (dayOfWeekHebrew !== " שישי" && dayOfWeekHebrew !== "  שבת") {
      const classes = scheduleMap[dayOfWeekHebrew.trim()] || [];
      let attendanceText = classes.join(", ");
      const currentDateStr = currentDate.format("YYYY-MM-DD");

      if (selectedDate.format("YYYY-MM") === "2025-04") {
        if (["2025-04-13", "2025-04-14", "2025-04-15", "2025-04-16", "2025-04-17"].includes(currentDateStr)) {
          attendanceText = "חג-הפסח";
        } else if (currentDateStr === "2025-04-20") {
          attendanceText = "אסרו-חג";
        }
      }

      reportData.push({
        gregorianDate,
        dayOfWeekHebrew,
        attendanceText,
      });
    }

    currentDate = currentDate.add(1, "day");
  }

  const doc = new PDFDocument({ lang: "he", margin: 40 });
  const buffers: Uint8Array[] = [];

  doc.on("data", (chunk) => buffers.push(chunk));
  doc.on("end", () => {});

  const fontPath = path.join(__dirname, "../fonts/Rubik-VariableFont_wght.ttf");
  doc.font(fontPath);

  const revDate = selectedDate.format("MM-YYYY");

  doc.fontSize(14)
    .text("דוח נוכחות לחודש ", 350, 50, { align: "right", features: ["rtla"], continued: true })
    .text(`${revDate}`, 245, 50, { align: "right" })
    .moveDown(0.5);

  doc.fontSize(12)
    .text(`שם המפעיל: ${operator.firstName} ${operator.lastName}`, { align: "right", features: ["rtla"] })

  const startY = 112;
  let y = startY + 22;
  const rowHeight = 25;

  doc.fontSize(10)
    .text("תאריך לועזי", 490, startY, { features: ["rtla"], underline: true })
    .text("יום בשבוע", 404, startY, { features: ["rtla"], underline: true })
    .text("נוכחות - סמלים", 290, startY, { features: ["rtla"], underline: true })
    .text("האם בוצע / הערות", 130, startY, { features: ["rtla"], underline: true });

  reportData.forEach((row, index) => {
    const isThursday = row.dayOfWeekHebrew === "חמישי";
    doc.fontSize(10)
      .text(row.gregorianDate, 480, y, { width: 60, align: "right", features: ["rtla"] })
      .text(row.dayOfWeekHebrew, 375, y, { width: 60, align: "right" })
      .text(row.attendanceText, 215, y, { width: 150, align: "right" });
    doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(0.5).strokeColor("#CCCCCC").stroke();
    if (isThursday && index !== reportData.length - 1) {
      doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(1.2).strokeColor("#000000").stroke();
    }
    y += rowHeight;
  });

  doc.lineWidth(0.5).moveTo(463, 135).lineTo(463, y).stroke();
  doc.lineWidth(0.5).moveTo(380, 135).lineTo(380, y).stroke();

  y += 15;

  doc.fontSize(12)
    .text(`סה\"כ הפעלות בחודש: ____________________`, 200, y, { align: "right", features: ["rtla"] });

  doc.end();
  

  return await buffer(doc);
};

  
export const generateAttendancePdf = (month: string, res: Response) => {
  const selectedDate = dayjs(month);
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

export const generateAttendancePdfByOp = (

  month: string,
  operator: Operator,
  res: Response
) => {
  const selectedDate = dayjs(month);
  const startDate = selectedDate.subtract(1, "month").date(26);
  const endDate = selectedDate.date(25);
  const reportData = [];

  console.log("operator", operator);
  console.log("weeklySchedule", operator.weeklySchedule);

  const scheduleMap: Record<string, string[]> = {};
  operator.weeklySchedule.forEach((entry) => {
    scheduleMap[entry.day.trim()] = entry.classes || [];
  });

  let currentDate = startDate;

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    const gregorianDate = currentDate.format("DD/MM/YYYY");
    const dayOfWeekEnglish = currentDate.format("dddd");
    const dayOfWeekHebrew = daysOfWeekHebrew[dayOfWeekEnglish];

    if (dayOfWeekHebrew.trim() !== "שישי" && dayOfWeekHebrew.trim() !== "שבת") {
      const classes = scheduleMap[dayOfWeekHebrew.trim()] || [];
      const attendanceText = classes.join(", ");

      reportData.push({
        gregorianDate,
        dayOfWeekHebrew,
        attendanceText,
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

  const revDate = selectedDate.format("MM-YYYY");

  doc.fontSize(14)
    .text("דוח נוכחות לחודש ", 350, 50, { align: "right", features: ["rtla"], continued: true })
    .text(`${revDate}`, 245, 50, { align: "right" })
    .moveDown(0.5);

  doc.fontSize(10)
    .text(`שם המפעיל: ${operator.firstName} ${operator.lastName}`, { align: "right", features: ["rtla"] })
    .moveDown(0.5)
    .text(`תעודת זהות: ${operator.id}`, { align: "right", features: ["rtla"] });

  const startY = 135;
  doc.fontSize(10)
    .text("תאריך לועזי", 490, startY, { features: ["rtla"], underline: true })
    .text("יום בשבוע", 400, startY, { features: ["rtla"], underline: true })
    .text("נוכחות - סמלים", 290, startY, { features: ["rtla"], underline: true })
    .text("האם בוצע / הערות", 130, startY, { features: ["rtla"], underline: true });

  let y = startY + 22;
  const rowHeight = 25;

  reportData.forEach((row, index) => {
    const isThursday = row.dayOfWeekHebrew === "חמישי";

    doc.fontSize(10)
      .text(row.gregorianDate, 480, y,{
        width: 60,
        align: "right",
        features: ["rtla"]
      }
      )
      .text(row.dayOfWeekHebrew, 375, y, {
        width: 60,
        align: "right",
      })
      .text(row.attendanceText, 215, y, {
        width: 150,
        align: "right",
      });

    doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(0.5).strokeColor("#CCCCCC").stroke();

    if (isThursday && index !== reportData.length - 1) {
      doc.moveTo(50, y + rowHeight - 5).lineTo(550, y + rowHeight - 5).lineWidth(1.2).strokeColor("#000000").stroke();
    }

    y += rowHeight;
  });

  doc.lineWidth(0.5).moveTo(463, 135).lineTo(463, y).stroke();
  doc.lineWidth(0.5).moveTo(380, 135).lineTo(380, y).stroke();

  y += 15;

  doc
    .fontSize(11)
    .text(`סה"כ הפעלות בחודש: ____________________`, 200, y, {
      align: "right",
      features: ["rtla"]
    });
  
  doc.end();
};
