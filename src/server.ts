import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import classRoutes from './routes/classRoutes';
import storeRoutes from './routes/storeRoutes';
import activityRoutes from './routes/activityRoutes';
import operatorRoutes from './routes/operatorRoutes';
import cors from 'cors';
import purchaseRoutes from './routes/purchaseRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import authRoutes from './routes/authRoutes';
import { generateAttendancePdf} from './utils/generatePdf';
import pdfRoutes from './routes/pdfRoutes';
import emailRoutes from './routes/emailRoutes';
import documentRoutes from './routes/documentRoutes';
import workerRoutes from './routes/workerAfterNoonRoutes';
import workerAssignmentRoutes from './routes/workerAssignmentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import coordinatorRoutes from './routes/coordinatorRoutes';
import userRoutes from './routes/userRoutes';
import { 
  securityHeaders, 
  apiRateLimit, 
  speedLimiter, 
  sanitizeInput, 
  preventParameterPollution, 
  securityLogger 
} from './middleware/security';

dotenv.config();
const app = express();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS as string).split(',');

app.use(securityHeaders);
app.use(securityLogger);
app.use(sanitizeInput);
app.use(preventParameterPollution);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/', apiRateLimit);
app.use('/api/', speedLimiter);

connectDB();

app.use('/api/classes', classRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/activities', activityRoutes);
app.use("/api/operators", operatorRoutes);
app.use("/api/worker-after-noon", workerRoutes);
app.use('/api/worker-assignments', workerAssignmentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/generate-pdf-by-op', pdfRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/coordinators', coordinatorRoutes);
app.use('/api/users', userRoutes);

const path = require('path');
app.post("/api/generate-pdf", (req, res) => {
  const { month } = req.body;
  generateAttendancePdf(month, res);
});
  
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({ message: 'העמוד לא נמצא' });
});

const PORT = process.env.PORT as string;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
