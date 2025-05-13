import { Request, Response } from 'express';
import Institution from '../models/Institution';

export const addInstitution = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = new Institution({
      ...req.body,
      isActive: true,
    });

    await institution.save();
    res.status(201).json(institution);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const getInstitutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const institutions = await Institution.find({ isActive: true }); 
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getInstitutionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = await Institution.findOne({ _id: req.params.id, isActive: true });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found or inactive' });
      return;
    }

    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const deleteInstitution = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    res.status(200).json({ message: 'Institution deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateInstitution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const updatedInstitution = await Institution.findOneAndUpdate(
      { _id: id, isActive: true }, 
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedInstitution) {
      res.status(404).json({ error: 'Institution not found or inactive' });
      return;
    }

    res.status(200).json(updatedInstitution);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
