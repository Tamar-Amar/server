import axios from 'axios';
import { WorkerDocument } from '../models/Worker';

class ShoveitService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.SHOVEIT_API_URL || '';
    this.apiKey = process.env.SHOVEIT_API_KEY || '';

    if (!this.baseUrl) {
      console.warn('Warning: SHOVEIT_API_URL is not configured');
    }
    if (!this.apiKey) {
      console.warn('Warning: SHOVEIT_API_KEY is not configured');
    }
  }

  async updateWorkerData(worker: WorkerDocument) {
    try {
      if (!this.baseUrl || !this.apiKey) {
        throw new Error('Shoveit configuration is missing. Please check SHOVEIT_API_URL and SHOVEIT_API_KEY environment variables.');
      }

      console.log(`Updating worker ${worker.id} in Shoveit system...`);

      const payload = {
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        phone: worker.phone,
        email: worker.email,
        bankDetails: worker.bankDetails,
        paymentMethod: worker.paymentMethod,
        // הוספת שדות נוספים שנדרשים למערכת שובעית
        address: {
          city: worker.city,
          street: worker.street,
          buildingNumber: worker.buildingNumber,
          apartmentNumber: worker.apartmentNumber
        },
        identityNumber: worker.id, // תעודת זהות
        birthDate: worker.birthDate
      };

      const response = await axios.post(
        `${this.baseUrl}/api/workers`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Successfully updated worker ${worker.id} in Shoveit system`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error updating worker in Shoveit:', errorMessage);
      throw new Error(`Shoveit API error: ${errorMessage}`);
    }
  }
}

export default new ShoveitService(); 