import { Request, Response } from 'express';
import { WorkerAssignmentService } from '../services/WorkerAssignmentService';
import { AuthenticatedRequest } from '../middleware/auth';

// יצירת חיבור חדש
export const createAssignment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { workerId, classId, projectCode, roleName, startDate, endDate, notes } = req.body;
    
    if (!workerId || !classId || !projectCode || !roleName || !startDate) {
      res.status(400).json({ error: 'כל השדות הנדרשים חייבים להיות מלאים' });
      return;
    }

    const assignment = await WorkerAssignmentService.createAssignment({
      workerId,
      classId,
      projectCode,
      roleName,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      updateBy: req.user?.username || 'מערכת',
      notes
    });

    res.status(201).json(assignment);
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת חיבורים של עובד
export const getWorkerAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerId } = req.params;
    const { isActive } = req.query;
    
    const assignments = await WorkerAssignmentService.getWorkerAssignments(
      workerId, 
      isActive === 'true'
    );

    res.status(200).json(assignments);
  } catch (err) {
    console.error('Error getting worker assignments:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת חיבורים של כיתה
export const getClassAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { isActive } = req.query;
    
    const assignments = await WorkerAssignmentService.getClassAssignments(
      classId, 
      isActive === 'true'
    );

    res.status(200).json(assignments);
  } catch (err) {
    console.error('Error getting class assignments:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת חיבורים לפי פרויקט
export const getProjectAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectCode } = req.params;
    const { isActive } = req.query;
    
    const assignments = await WorkerAssignmentService.getProjectAssignments(
      parseInt(projectCode), 
      isActive === 'true'
    );

    res.status(200).json(assignments);
  } catch (err) {
    console.error('Error getting project assignments:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת חיבורים פעילים בתאריך מסוים
export const getActiveAssignmentsOnDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    
    if (!date) {
      res.status(400).json({ error: 'תאריך נדרש' });
      return;
    }

    const assignments = await WorkerAssignmentService.getActiveAssignmentsOnDate(new Date(date as string));
    res.status(200).json(assignments);
  } catch (err) {
    console.error('Error getting active assignments on date:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// עדכון חיבור
export const updateAssignment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const updates = req.body;
    
    const assignment = await WorkerAssignmentService.updateAssignment(assignmentId, updates);
    
    if (!assignment) {
      res.status(404).json({ error: 'חיבור לא נמצא' });
      return;
    }

    res.status(200).json(assignment);
  } catch (err) {
    console.error('Error updating assignment:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// סיום חיבור
export const endAssignment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const { endDate } = req.body;
    
    if (!endDate) {
      res.status(400).json({ error: 'תאריך סיום נדרש' });
      return;
    }

    const assignment = await WorkerAssignmentService.endAssignment(
      assignmentId, 
      new Date(endDate), 
      req.user?.username || 'מערכת'
    );
    
    if (!assignment) {
      res.status(404).json({ error: 'חיבור לא נמצא' });
      return;
    }

    res.status(200).json(assignment);
  } catch (err) {
    console.error('Error ending assignment:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// מחיקת חיבור
export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    
    const success = await WorkerAssignmentService.deleteAssignment(assignmentId);
    
    if (!success) {
      res.status(404).json({ error: 'חיבור לא נמצא' });
      return;
    }

    res.status(200).json({ message: 'חיבור נמחק בהצלחה' });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת היסטוריית עובד
export const getWorkerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerId } = req.params;
    
    const history = await WorkerAssignmentService.getWorkerHistory(workerId);
    res.status(200).json(history);
  } catch (err) {
    console.error('Error getting worker history:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// קבלת היסטוריית כיתה
export const getClassHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    
    const history = await WorkerAssignmentService.getClassHistory(classId);
    res.status(200).json(history);
  } catch (err) {
    console.error('Error getting class history:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// יצירת חיבורים מרובים
export const createMultipleAssignments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      res.status(400).json({ error: 'נדרש מערך של חיבורים' });
      return;
    }

    const assignmentsWithUser = assignments.map(assignment => ({
      ...assignment,
      startDate: new Date(assignment.startDate),
      endDate: assignment.endDate ? new Date(assignment.endDate) : undefined,
      updateBy: req.user?.username || 'מערכת'
    }));

    const createdAssignments = await WorkerAssignmentService.createMultipleAssignments(assignmentsWithUser);
    res.status(201).json(createdAssignments);
  } catch (err) {
    console.error('Error creating multiple assignments:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};
