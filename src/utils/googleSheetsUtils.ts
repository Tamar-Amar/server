
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import Activity from '../models/Activity';
import Class from '../models/Class';
import '../models/Operator';
import dotenv from 'dotenv';
import { holidays } from './holidays'; 

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SHEET_NAME = 'google api';

type PopulatedActivity = {
  classId: { uniqueSymbol: string; name: string; gender: string; type: string };
  operatorId: { firstName: string; lastName: string } | string | null;
  date: Date | string;
  description?: string;
  monthPayment: string;
};

export const generateYearlySheet = async (
  sheets: any,
  spreadsheetId: string,
  activities: PopulatedActivity[],
  allClasses: any[],
  weeks: { start: Date; end: Date }[]
) => {
  const holidayDates = new Set(holidays.map(h => h.date));

  const isFullHolidayWeek = (week: { start: Date }) => {
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(week.start.getTime() + i * 86400000);
      return d.toLocaleDateString('sv-SE');
    });
    return days.every(dateStr => holidayDates.has(dateStr));
  };

  const reportData: Record<string, { name: string; gender: string; type: string; weeklyOperators: string[][] }> = {};
  allClasses.forEach(cls => {
    reportData[cls.uniqueSymbol] = {
      name: cls.name,
      gender: cls.gender,
      type: cls.type,
      weeklyOperators: Array.from({ length: weeks.length }, () => []),
    };
  });

  activities.forEach(activity => {
    if (typeof activity.classId === 'string' || !activity.classId || !activity.date) return;
    const date = new Date(activity.date);
    const key = activity.classId.uniqueSymbol;
    const weekIndex = weeks.findIndex(({ start, end }) => date >= start && date <= end);
    if (weekIndex === -1) return;

    let operator = 'לא ידוע';
    if (activity.operatorId && typeof activity.operatorId !== 'string') {
      operator = `${activity.operatorId.firstName} ${activity.operatorId.lastName}`;
    }

    reportData[key]?.weeklyOperators[weekIndex].push(operator);
  });

  const row1 = ['סמל', 'שם', 'מין', 'סוג', ...weeks.map((_, i) => `שבוע ${i + 1}`), 'ניצול', 'צפי', 'פער'];
  const row2 = ['', '', '', '', ...weeks.map(w => w.start.toLocaleDateString('he-IL')), '', '', ''];
  const row3 = ['', '', '', '', ...weeks.map(w => w.end.toLocaleDateString('he-IL')), '', '', ''];

  const activeWeeksCount = weeks.filter(w => !isFullHolidayWeek(w)).length;

  const dataRows = allClasses.map(cls => {
    const classData = reportData[cls.uniqueSymbol];
    const row = [cls.uniqueSymbol, cls.name, cls.gender, cls.type];
    let total = 0;

    weeks.forEach(w => {
      if (isFullHolidayWeek(w)) {
        row.push('ללא צהרון');
      } else {
        const ops = classData?.weeklyOperators[weeks.indexOf(w)] || [];
        row.push(ops.join(', '));
        total += ops.length;
      }
    });

    const forecast = activeWeeksCount;
    const diff = forecast - total;
    row.push(`${total}`);      // ניצול
    row.push(`${forecast}`);   // צפי
    row.push(`${diff}`);       // פער
    return row;
  });

  const footerRow = ['', '', '', '', ...weeks.map(w => isFullHolidayWeek(w) ? 'ללא צהרון' : ''), '', '', ''];
  const fullData = [row1, row2, row3, ...dataRows, footerRow];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'google api'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: fullData },
  });
};


export const generateMonthlySheets = async (
  sheets: any,
  spreadsheetId: string,
  allClasses: any[],
  weeks: { start: Date; end: Date }[],
  reportData: Record<string, { name: string; gender: string; type: string; weeklyOperators: string[][] }>
) => {
  const holidayDates = new Set(holidays.map(h => h.date));
  const allowedMonths = [10, 11, 0, 1, 2, 3, 4, 5];
  const monthMap: Record<number, string> = {
    0: 'ינואר', 1: 'פברואר', 2: 'מרץ', 3: 'אפריל',
    4: 'מאי', 5: 'יוני', 6: 'יולי', 7: 'אוגוסט',
    8: 'ספטמבר', 9: 'אוקטובר', 10: 'נובמבר', 11: 'דצמבר',
  };

  const isFullHolidayWeek = (week: { start: Date }) => {
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(week.start.getTime() + i * 86400000);
      return d.toLocaleDateString('sv-SE');
    });
    return days.every(dateStr => holidayDates.has(dateStr));
  };

  const monthlyWeeksMap: Record<string, { start: Date; end: Date; index: number }[]> = {};
  weeks.forEach((w, i) => {
    const monthRef = w.start.getDate() >= 26 ? new Date(w.start.getFullYear(), w.start.getMonth() + 1, 1) : w.start;
    const monthIndex = monthRef.getMonth();
    if (!allowedMonths.includes(monthIndex)) return;
    const monthName = monthMap[monthIndex];
    if (!monthlyWeeksMap[monthName]) monthlyWeeksMap[monthName] = [];
    monthlyWeeksMap[monthName].push({ ...w, index: i });
  });

  for (const [monthName, weekGroup] of Object.entries(monthlyWeeksMap)) {
    const headers = ['סמל', 'שם', 'מין', 'סוג', ...weekGroup.map((_, i) => `שבוע ${i + 1}`), 'ניצול', 'צפי', 'פער'];
    const startsRow = ['', '', '', '', ...weekGroup.map(w => w.start.toLocaleDateString('he-IL')), '', '', ''];
    const endsRow = ['', '', '', '', ...weekGroup.map(w => w.end.toLocaleDateString('he-IL')), '', '', ''];

    const rows = allClasses.map(cls => {
      const classData = reportData[cls.uniqueSymbol];
      const row = [cls.uniqueSymbol, cls.name, cls.gender, cls.type];
      let total = 0;

      weekGroup.forEach(w => {
        const isHolidayWeek = isFullHolidayWeek(w);
        if (isHolidayWeek) {
          row.push('ללא צהרון');
        } else {
          const ops = classData?.weeklyOperators[w.index] || [];
          row.push(ops.join(', '));
          total += ops.length;
        }
      });

      const forecast = weekGroup.filter(w => !isFullHolidayWeek(w)).length;
      const diff = forecast - total;

      row.push(`${total}`);    // ניצול
      row.push(`${forecast}`); // צפי
      row.push(`${diff}`);     // פער
      return row;
    });

    const footerRow = ['', '', '', '', ...weekGroup.map(w => isFullHolidayWeek(w) ? 'ללא צהרון' : ''), '', '', ''];
    const values = [headers, startsRow, endsRow, ...rows, footerRow];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${monthName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
};
