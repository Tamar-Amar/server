import express, { RequestHandler } from 'express';
import Operator from '../models/Operator';
import { generateAttendancePdfByOp } from '../utils/generatePdf';

const router = express.Router();

import ClassModel, { ClassDocument } from '../models/Class';
import { Types } from 'mongoose';

const generatePdfHandler: RequestHandler = async (req, res) => {
  const { month, operatorId } = req.body;
  if (!month || !operatorId) {
    res.status(400).send("Missing data");
    return;
  }

  const operator = await Operator.findById(operatorId);
  if (!operator) {
    res.status(404).send("Operator not found");
    return;
  }

  const classIds = operator.weeklySchedule.flatMap((d) => d.classes);
  const allClasses = await ClassModel.find({ _id: { $in: classIds } });

  const classMap = new Map<string, string>(
    allClasses.map((cls: ClassDocument) => [
        (cls._id as Types.ObjectId).toString(),
      cls.uniqueSymbol 
    ])
  );

  const cleanedOperator = {
    ...operator.toObject(),
    weeklySchedule: operator.weeklySchedule.map((day) => ({
      day: day.day,
      classes: day.classes.map((cls) => classMap.get(cls.toString()) || "❓"),
    })),
  };

  generateAttendancePdfByOp(month, cleanedOperator, res);
};

  

router.post('/', generatePdfHandler);


export default router;
