import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import Activity from '../models/Activity';
import Class from '../models/Class';
import '../models/Operator';
import dotenv from 'dotenv';

dotenv.config();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1byRItDPN42He3Hb2j-k7vtnH9EtmUV5l3NQp12u5oqM';
const SHEET_NAME = 'google api';

type PopulatedActivity = {
  classId: {
    uniqueSymbol: string;
    name: string;
  };
  operatorId: {
    firstName: string;
    lastName: string;
  } | string | null;
  date: Date | string;
  description?: string;
  monthPayment: string;
};

export const uploadActivitiesToGoogleSheet = async (activities: PopulatedActivity[]) => {
  const startDate = new Date('2024-10-27');
  const endDate = new Date('2025-06-30');

  const weeks: { start: Date; end: Date }[] = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    weeks.push({ start, end });
    current.setDate(current.getDate() + 7);
  }

  const allClasses = await Class.find({}, 'uniqueSymbol name').lean();

  const reportData: Record<string, { name: string; weeklyOperators: string[][] }> = {};

  allClasses.forEach(cls => {
    const key = cls.uniqueSymbol;
    reportData[key] = {
      name: cls.name,
      weeklyOperators: Array.from({ length: weeks.length }, () => []),
    };
  });

  activities.forEach(activity => {
    if (typeof activity.classId === 'string' || !activity.classId || !activity.date) return;

    const date = new Date(activity.date);
    let operator = 'לא ידוע';

    if (activity.operatorId && typeof activity.operatorId !== 'string') {
      operator = `${activity.operatorId.firstName} ${activity.operatorId.lastName}`;
    }

    const weekIndex = weeks.findIndex(({ start, end }) => date >= start && date <= end);
    if (weekIndex === -1) return;

    const key = activity.classId.uniqueSymbol;
    reportData[key]?.weeklyOperators[weekIndex].push(operator);
  });

  const row1 = ['סמל', 'שם', ...weeks.map((_, i) => `שבוע ${i + 1}`), 'סה"כ'];
  const row2 = ['', '', ...weeks.map(w => w.start.toLocaleDateString('he-IL')), ''];
  const row3 = ['', '', ...weeks.map(w => w.end.toLocaleDateString('he-IL')), ''];

  const dataRows = Object.entries(reportData).map(([symbol, { name, weeklyOperators }]) => {
    const totalCount = weeklyOperators.reduce((sum, ops) => sum + ops.length, 0);
    return [symbol, name, ...weeklyOperators.map(ops => ops.join(', ')), totalCount];
  });

  const fullData = [row1, row2, row3, ...dataRows];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: fullData,
    },
  });

  console.log('✅ הדוח נשלח ל־Google Sheets');
};
