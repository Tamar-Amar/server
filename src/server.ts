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
import authRoutes from './routes/authRoutes';
import { generateAttendancePdf} from './utils/generatePdf';
import contactRoutes from './routes/contactRoutes';
import pdfRoutes from './routes/pdfRoutes';
import emailRoutes from './routes/emailRoutes';


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
app.use('/api/contacts', contactRoutes);
app.use('/api/generate-pdf-by-op', pdfRoutes);
app.use('/api/email', emailRoutes);

const path = require('path');
app.post("/api/generate-pdf", (req, res) => {
  const { month } = req.body;
  generateAttendancePdf(month, res);
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
