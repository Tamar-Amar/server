import WorkerAssignment, { WorkerAssignmentDocument } from '../models/WorkerAssignment';
import { Types } from 'mongoose';

export class WorkerAssignmentService {
  
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

  static async getWorkerAssignments(workerId: string, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      workerId: new Types.ObjectId(workerId),
      isActive: isActive
    }).populate('classId').populate('workerId');
  }

  static async getClassAssignments(classId: string, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      classId: new Types.ObjectId(classId),
      isActive: isActive
    }).populate('workerId').populate('classId');
  }

  static async getProjectAssignments(projectCode: number, isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      projectCode: projectCode,
      isActive: isActive
    }).populate('workerId').populate('classId');
  }

  static async getAllAssignments(isActive: boolean = true): Promise<WorkerAssignmentDocument[]> {
    const assignments = await WorkerAssignment.find({
      isActive: true
    }).populate('workerId').populate('classId');
    
    return assignments;
  }

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

  static async deleteAssignment(assignmentId: string): Promise<boolean> {
    const result = await WorkerAssignment.findByIdAndDelete(assignmentId);
    return !!result;
  }

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

  static async getWorkerHistory(workerId: string): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      workerId: new Types.ObjectId(workerId)
    })
    .sort({ startDate: -1 })
    .populate('workerId')
    .populate('classId');
  }

  static async getClassHistory(classId: string): Promise<WorkerAssignmentDocument[]> {
    return await WorkerAssignment.find({
      classId: new Types.ObjectId(classId)
    })
    .sort({ startDate: -1 })
    .populate('workerId')
    .populate('classId');
  }

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

