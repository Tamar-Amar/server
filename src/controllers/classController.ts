import { Request, Response } from 'express';
import Class from '../models/Class';
import mongoose from 'mongoose';

export const addClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, education, gender, address, uniqueSymbol, chosenStore, institutionName, institutionCode, type, hasAfternoonCare, monthlyBudget, childresAmount, AfternoonOpenDate, description, regularOperatorId, workerAfterNoonId1, workerAfterNoonId2, projectCode, street, streetNumber } = req.body;

    
  
    if (!name || !type || !education || !gender || !uniqueSymbol || !institutionName || !institutionCode) {
      res.status(400).json({ 
        error: 'Missing required fields: name, type, education, gender, uniqueSymbol, institutionName, institutionCode',
        missing: { 
          name: !name, 
          type: !type, 
          education: !education, 
          gender: !gender, 
          uniqueSymbol: !uniqueSymbol, 
          institutionName: !institutionName, 
          institutionCode: !institutionCode 
        }
      });
      return;
    }

  
    if (!['כיתה', 'גן'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Must be "כיתה" or "גן"' });
      return;
    }

    if (!['בנים', 'בנות'].includes(gender)) {
      res.status(400).json({ error: 'Invalid gender. Must be "בנים" or "בנות"' });
      return;
    }

    const existingClass = await Class.findOne({ uniqueSymbol });

    if (existingClass) {
      res.status(400).json({ error: 'Class with this uniqueSymbol already exists' });
      return;
    }

    const newClassData: any = {
      name,
      education,
      gender,
      uniqueSymbol,
      institutionName,
      institutionCode,  
      type,
      hasAfternoonCare: hasAfternoonCare || false,
      monthlyBudget: monthlyBudget || 0,
      childresAmount: childresAmount || 0,
      description: description || '',
      isActive: true, 
    };

  
    if (address && address.trim() !== '') {
      newClassData.address = address;
    }

  
    if (chosenStore && chosenStore.trim() !== '') {
      newClassData.chosenStore = chosenStore;
    }
    if (regularOperatorId && regularOperatorId.trim() !== '') {
      newClassData.regularOperatorId = regularOperatorId;
    }
    if (AfternoonOpenDate) {
      newClassData.AfternoonOpenDate = AfternoonOpenDate;
    }
    if (projectCode) {
    
      newClassData.projectCodes = Array.isArray(projectCode) ? projectCode : [projectCode];
    }
    if (street && street.trim() !== '') {
      newClassData.street = street;
    }
    if (streetNumber && streetNumber.trim() !== '') {
      newClassData.streetNumber = streetNumber;
    }
    if (workerAfterNoonId1) {
      newClassData.workerAfterNoonId1 = workerAfterNoonId1;
    }
    if (workerAfterNoonId2) {
      newClassData.workerAfterNoonId2 = workerAfterNoonId2;
    }

    const newClass = new Class(newClassData);
    await newClass.save();
    res.status(201).json(newClass);
  } catch (err) {

    res.status(400).json({ error: (err as Error).message });
  }
};

export const addMultipleClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classes } = req.body;
    
    if (!Array.isArray(classes) || classes.length === 0) {
      res.status(400).json({ error: 'Classes array is required and must not be empty' });
      return;
    }

    const results = {
      created: [] as any[],
      errors: [] as any[],
      total: classes.length
    };

  
    const uniqueSymbols = classes.map((cls: any) => cls.uniqueSymbol).filter(Boolean);
    const existingClasses = await Class.find({ uniqueSymbol: { $in: uniqueSymbols } });
    const existingSymbols = new Set(existingClasses.map(cls => cls.uniqueSymbol));

  
    const classesToSave = classes
      .filter((cls: any) => {
      
        if (!cls.name || !cls.type || !cls.education || !cls.gender || !cls.uniqueSymbol || !cls.institutionName || !cls.institutionCode) {
          results.errors.push({
            uniqueSymbol: cls.uniqueSymbol || 'unknown',
            error: 'Missing required fields'
          });
          return false;
        }

      
        if (!['כיתה', 'גן'].includes(cls.type)) {
          results.errors.push({
            uniqueSymbol: cls.uniqueSymbol,
            error: 'Invalid type. Must be "כיתה" or "גן"'
          });
          return false;
        }

        if (!['בנים', 'בנות'].includes(cls.gender)) {
          results.errors.push({
            uniqueSymbol: cls.uniqueSymbol,
            error: 'Invalid gender. Must be "בנים" or "בנות"'
          });
          return false;
        }

      
        if (existingSymbols.has(cls.uniqueSymbol)) {
          results.errors.push({
            uniqueSymbol: cls.uniqueSymbol,
            error: 'Class with this uniqueSymbol already exists'
          });
          return false;
        }

        return true;
      })
      .map((cls: any) => {
        const classData: any = {
          name: cls.name,
          education: cls.education,
          gender: cls.gender,
          uniqueSymbol: cls.uniqueSymbol,
          institutionName: cls.institutionName,
          institutionCode: cls.institutionCode,
          type: cls.type,
          hasAfternoonCare: cls.hasAfternoonCare || false,
          monthlyBudget: cls.monthlyBudget || 0,
          childresAmount: cls.childresAmount || 0,
          description: cls.description || '',
          isActive: true,
        };

      
        if (cls.address && cls.address.trim() !== '') {
          classData.address = cls.address;
        }
        if (cls.chosenStore && cls.chosenStore.trim() !== '') {
          classData.chosenStore = cls.chosenStore;
        }
        if (cls.regularOperatorId && cls.regularOperatorId.trim() !== '') {
          classData.regularOperatorId = cls.regularOperatorId;
        }
        if (cls.AfternoonOpenDate) {
          classData.AfternoonOpenDate = cls.AfternoonOpenDate;
        }
        if (cls.projectCodes) {
          classData.projectCodes = Array.isArray(cls.projectCodes) ? cls.projectCodes : [cls.projectCodes];
        }
        if (cls.street && cls.street.trim() !== '') {
          classData.street = cls.street;
        }
        if (cls.streetNumber && cls.streetNumber.trim() !== '') {
          classData.streetNumber = cls.streetNumber;
        }

        return new Class(classData);
      });

    if (classesToSave.length > 0) {
      const savedClasses = await Class.insertMany(classesToSave, { ordered: false });
      results.created = savedClasses;
    }

    res.status(200).json({
      message: `Import completed: ${results.created.length} created, ${results.errors.length} errors`,
      results
    });

  } catch (err) {
    console.error('Error creating multiple classes:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getAllClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const classes = await Class.find({ isActive: true });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const classToDelete = await Class.findOne({ _id: req.params.id, isActive: true });

    if (!classToDelete) {
      res.status(404).json({ error: 'Class not found or already deactivated' });
      return;
    }
    
    await Class.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Class deactivated successfully' });

  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid class ID format' });
      return;
    }

    const cleanedUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedUpdateData[key] = value;
      }
    });

    const updatedClass = await Class.findByIdAndUpdate(id, cleanedUpdateData, { new: true, runValidators: true });

    if (!updatedClass) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.status(200).json(updatedClass);
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};

export const updateMultipleClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: 'Updates array is required and must not be empty' });
      return;
    }

    const results = {
      updated: [] as any[],
      errors: [] as any[],
      total: updates.length
    };


    const bulkOperations: any[] = [];
    
    for (const update of updates) {
      const { id, updatedClass } = update;
      
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        results.errors.push({
          id: id || 'unknown',
          error: 'Invalid class ID format'
        });
        continue;
      }


      const cleanedUpdateData: any = {};
      Object.keys(updatedClass).forEach(key => {
        const value = updatedClass[key];
        if (value !== null && value !== undefined && value !== '') {
          cleanedUpdateData[key] = value;
        }
      });

      if (Object.keys(cleanedUpdateData).length === 0) {
        results.errors.push({
          id: id,
          error: 'No valid fields to update'
        });
        continue;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: cleanedUpdateData },
          upsert: false
        }
      });
    }

    if (bulkOperations.length > 0) {
      const bulkResult = await Class.bulkWrite(bulkOperations);      

      const updatedIds = updates.map((update: any) => update.id).filter(Boolean);
      const updatedClasses = await Class.find({ _id: { $in: updatedIds } });
      results.updated = updatedClasses;
    }

    res.status(200).json({
      message: `Bulk update completed: ${results.updated.length} updated, ${results.errors.length} errors`,
      results
    });

  } catch (err) {
    console.error('Error updating multiple classes:', err);
    res.status(400).json({ error: (err as Error).message });
  }
};



export const getClassesByCoordinator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { coordinatorId } = req.params;    
    const classes = await Class.find({ coordinatorId, isActive: true });    
    res.status(200).json(classes);
  } catch (err) {
    console.error('getClassesByCoordinator - Error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const bulkAddWorkersToClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classToWorkersMap } = req.body;
    if (!classToWorkersMap || typeof classToWorkersMap !== 'object') {
      res.status(400).json({ error: 'classToWorkersMap is required' });
      return;
    }

    const classIds = Object.keys(classToWorkersMap);
    const bulkOps = classIds.map(classId => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(classId) },
        update: { $push: { workers: { $each: classToWorkersMap[classId] } } }
      }
    }));

    if (bulkOps.length > 0) {
      await Class.bulkWrite(bulkOps);
    }

    res.json({ success: true, updated: classIds.length });
  } catch (err) {
    console.error('Error in bulkAddWorkersToClasses:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getClassesByCoordinatorInstitutionCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { coordinatorId } = req.params;
    
    const User = require('../models/User').default;
    const coordinator = await User.findById(coordinatorId);
    
    if (!coordinator) {
      res.status(404).json({ error: 'רכז לא נמצא' });
      return;
    }

    if (!coordinator.projectCodes || coordinator.projectCodes.length === 0) {
      res.status(200).json([]);
      return;
    }

    const coordinatorInstitutionCodes = coordinator.projectCodes.map((pc: any) => pc.institutionCode);
    
    const classes = await Class.find({
      institutionCode: { $in: coordinatorInstitutionCodes },
      isActive: true
    })
    .populate('workers.workerId', 'firstName lastName id roleName')
    .sort({ uniqueSymbol: 1 });
    
    res.status(200).json(classes);
  } catch (err) {
    console.error('getClassesByCoordinatorInstitutionCodes - Error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
};
