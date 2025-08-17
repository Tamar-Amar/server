import WorkerAssignment, { WorkerAssignmentDocument } from '../models/WorkerAssignment';
import { Types } from 'mongoose';

export class WorkerAssignmentService {
  
  // יצירת חיבור חדש
  static async createAssignment(data: {
    workerId: string;
    classId: string;
    projectCode: number;
    roleName: string;
    startDate: Date;
    endDate?: Date;
    updateBy: string;
    notes?: string;
  }): Promise<WorkerAssignmentDocument> {
    const assignment = new WorkerAssignment({
      workerId: new Types.ObjectId(data.workerId),
      classId: new Types.ObjectId(data.classId),
      projectCode: data.projectCode,
      roleName: data.roleName,
      startDate: data.startDate,
      endDate: data.endDate,
      updateBy: data.updateBy,
      notes: data.notes
    });
    
    return await assignment.save();
  }

  // קבלת כל החיבורים הפעילים של עובד
  static async getWorkerAssignments(workerId: string, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      workerId: new Types.ObjectId(workerId),
      isActive: isActive
    }).populate('classId').populate('workerId');
  }

  // קבלת כל החיבורים הפעילים של כיתה
  static async getClassAssignments(classId: string, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      classId: new Types.ObjectId(classId),
      isActive: isActive
    }).populate('workerId').populate('classId');
  }

  // קבלת חיבורים לפי פרויקט
  static async getProjectAssignments(projectCode: number, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      projectCode: projectCode,
      isActive: isActive
    }).populate('workerId').populate('classId');
  }

  // קבלת חיבורים פעילים בתאריך מסוים
  static async getActiveAssignmentsOnDate(date: Date): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      isActive: true,
      startDate: { $lte: date },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: date } }
      ]
    }).populate('workerId').populate('classId');
  }

  // עדכון חיבור
  static async updateAssignment(
    assignmentId: string, 
    updates: Partial<WorkerAssignmentDocument>
  ): Promise<WorkerAssignmentDocument | null> {
    return await WorkerAssignment.findByIdAndUpdate(
      assignmentId,
      { ...updates, updateDate: new Date() },
      { new: true }
    ).populate('workerId').populate('classId');
  }

  // סיום חיבור (הגדרת תאריך סיום)
  static async endAssignment(
    assignmentId: string, 
    endDate: Date, 
    updateBy: string
  ): Promise<WorkerAssignmentDocument | null> {
    return await WorkerAssignment.findByIdAndUpdate(
      assignmentId,
      { 
        endDate: endDate, 
        isActive: false, 
        updateDate: new Date(),
        updateBy: updateBy
      },
      { new: true }
    ).populate('workerId').populate('classId');
  }

  // מחיקת חיבור
  static async deleteAssignment(assignmentId: string): Promise<boolean> {
    const result = await WorkerAssignment.findByIdAndDelete(assignmentId);
    return !!result;
  }

  // בדיקה אם יש חיבור פעיל בין עובד לכיתה בפרויקט מסוים
  static async hasActiveAssignment(
    workerId: string, 
    classId: string, 
    projectCode: number
  ): Promise<boolean> {
    const assignment = await WorkerAssignment.findOne({
      workerId: new Types.ObjectId(workerId),
      classId: new Types.ObjectId(classId),
      projectCode: projectCode,
      isActive: true
    });
    
    return !!assignment;
  }

  // קבלת היסטוריית חיבורים של עובד
  static async getWorkerHistory(workerId: string): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      workerId: new Types.ObjectId(workerId)
    })
    .sort({ startDate: -1 })
    .populate('workerId')
    .populate('classId');
  }

  // קבלת היסטוריית חיבורים של כיתה
  static async getClassHistory(classId: string): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      classId: new Types.ObjectId(classId)
    })
    .sort({ startDate: -1 })
    .populate('workerId')
    .populate('classId');
  }

  // יצירת חיבורים מרובים
  static async createMultipleAssignments(assignments: Array<{
    workerId: string;
    classId: string;
    projectCode: number;
    roleName: string;
    startDate: Date;
    endDate?: Date;
    updateBy: string;
    notes?: string;
  }>): Promise<WorkerAssignmentDocument[]> {
    const assignmentDocs = assignments.map(data => new WorkerAssignment({
      workerId: new Types.ObjectId(data.workerId),
      classId: new Types.ObjectId(data.classId),
      projectCode: data.projectCode,
      roleName: data.roleName,
      startDate: data.startDate,
      endDate: data.endDate,
      updateBy: data.updateBy,
      notes: data.notes
    }));

    return await WorkerAssignment.insertMany(assignmentDocs);
  }
}
