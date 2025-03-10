import { Request, Response } from 'express';
import Contact from '../models/Contact';
import mongoose from 'mongoose';

// 📌 יצירת איש קשר חדש
export const addContact = async (req: Request, res: Response): Promise<void> => {
    try {
      let { name, phone, email, description, entityType, entityId } = req.body;
      console.log("req.body:", req.body);
  
      if (!name || !phone || !email || !entityType || !entityId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }
  
      // בדיקה ש-entityType הוא ערך תקין
      if (!["Institution", "Store", "Class"].includes(entityType)) {
        res.status(400).json({ error: "Invalid entityType" });
        return;
      }
  
      // בדיקה ש-entityId תקין
      if (!mongoose.Types.ObjectId.isValid(entityId)) {
        res.status(400).json({ error: "Invalid entityId" });
        return;
      }
  
      const newContact = new Contact({
        name,
        phone,
        email,
        description,
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
      });
  
      console.log("newContact:", newContact);
      await newContact.save();
      res.status(201).json(newContact);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };
  

// 📌 הבאת כל אנשי הקשר
export const getAllContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// 📌 הבאת איש קשר לפי ID
export const getContactById = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// 📌 עדכון איש קשר
export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json(updatedContact);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

// 📌 מחיקת איש קשר
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
