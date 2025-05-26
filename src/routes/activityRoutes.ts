import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

import { addActivity, deleteActivity, getActivitiesByClass, getActivitiesByOperator, getAllActivities, updateActivity } from '../controllers/activityController';
import Activity from '../models/Activity';
import Class from '../models/Class';
import GlobalFlag from '../models/GlobalFlag';

import { generateYearlySheet, generateMonthlySheets } from '../utils/googleSheetsUtils';

dotenv.config();
const router = express.Router();

type PopulatedActivity = {
  classId: {
    uniqueSymbol: string;
    name: string;
    gender: string;
    type: string;
  };
  operatorId: { firstName: string; lastName: string } | string | null;
  date: Date | string;
  description?: string;
  monthPayment: string;
};


router.post('/', addActivity);
router.get('/actByCls/:classId', getActivitiesByClass);
router.get('/actByOp/:operatorId', getActivitiesByOperator);
router.get('/', getAllActivities);
router.put('/activity', updateActivity);
router.delete('/:id', deleteActivity);

router.post('/export-to-sheets', async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('classId', 'uniqueSymbol name gender type')
      .populate('operatorId', 'firstName lastName')
      .lean() as unknown as PopulatedActivity[];

    const allClasses = await Class.find({}, 'uniqueSymbol name gender type').lean();

    const weeks: { start: Date; end: Date }[] = [];
    let current = new Date('2024-10-27');
    const endDate = new Date('2025-06-30');

    while (current <= endDate) {
      const start = new Date(current);
      const end = new Date(current);
      end.setDate(end.getDate() + 6);
      weeks.push({ start, end });
      current.setDate(current.getDate() + 7);
    }
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
      let operator = 'לא ידוע';
      if (
        activity.operatorId &&
        typeof activity.operatorId !== 'string'
      ) {
        operator = `${activity.operatorId.firstName} ${activity.operatorId.lastName}`;
      }


      const weekIndex = weeks.findIndex(({ start, end }) => date >= start && date <= end);
      if (weekIndex === -1) return;

      reportData[activity.classId.uniqueSymbol]?.weeklyOperators[weekIndex].push(operator);
    });

    const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    const auth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

    await generateYearlySheet(sheets, SPREADSHEET_ID, activities, allClasses, weeks);
    await generateMonthlySheets(sheets, SPREADSHEET_ID, allClasses, weeks, reportData);

    await GlobalFlag.findOneAndUpdate(
      { key: 'lastGoogleSheetUpdate' },
      { value: new Date().toISOString() },
      { upsert: true }
    );

    res.status(200).json({ message: 'דוח נשלח לגיליון בהצלחה' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'אירעה שגיאה בעת שליחת הדוח' });
  }
});

router.get('/last-google-update', async (req, res) => {
  const record = await GlobalFlag.findOne({ key: 'lastGoogleSheetUpdate' });
  res.json({ updatedAt: record?.value || null });
});

export default router;
