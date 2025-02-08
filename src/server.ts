import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import institutionRoutes from './routes/institutionRoutes';
import classRoutes from './routes/classRoutes';
import storeRoutes from './routes/storeRoutes';
import activityRoutes from './routes/activityRoutes';
import operatorRoutes from './routes/operatorRoutes';
import cors from 'cors';
import purchaseRoutes from './routes/purchaseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import Operator from './models/Operator';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import authRoutes from './routes/authRoutes';
import { generateAttendancePdf } from './utils/generatePdf';


dotenv.config();
const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS as string).split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());


connectDB();

app.use('/api/institutions', institutionRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/activities', activityRoutes);
app.use("/api/operators", operatorRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);

const path = require('path');

app.post("/api/generate-pdf", (req, res) => {
  const { month } = req.body;
  generateAttendancePdf(month, res);
});


app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(errorHandler);

//listen to the port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
