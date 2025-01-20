import { Request, Response } from 'express';
import Institution from '../models/Institution';

//add institution
export const addInstitution = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = new Institution(req.body);
    await institution.save();
    res.status(201).json(institution);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

//get all institutions
export const getInstitutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

//get institution by id
export const getInstitutionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

//delete institution by id
export const deleteInstitution = async (req: Request, res: Response): Promise<void> => {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
