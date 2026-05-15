import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

interface CreateVirtualAccountPayload {
  bvn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface TransferPayload {
  amount: number;
  accountNumber: string;
  bankCode: string;
  narration: string;
  reference: string;
}

interface SquadResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

class SquadService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SQUAD_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://api.squad.co/v1',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request/response interceptors for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Squad API error:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  /**
   * Create a virtual account with BVN verification
   * Ref: Squad API - Virtual Account Endpoint
   */
  async createVirtualAccount(payload: CreateVirtualAccountPayload): Promise<any> {
    try {
      const response = await this.client.post<
        SquadResponse<{
          id: string;
          account_number: string;
          account_name: string;
          bank_code: string;
          bank_name: string;
        }>
      >('/virtual-account', {
        bvn: payload.bvn,
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        phone_number: payload.phone,
        dob: payload.dateOfBirth,
      });

      if (response.data.status) {
        logger.info('Virtual account created successfully', {
          accountNumber: response.data.data.account_number,
        });
      }

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create virtual account:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Initiate a bank transfer from virtual account
   * Ref: Squad API - Transfer Endpoint
   */
  async transfer(payload: TransferPayload): Promise<any> {
    try {
      const response = await this.client.post<
        SquadResponse<{
          transaction_id: string;
          status: string;
          message: string;
        }>
      >('/transfer', {
        amount: payload.amount * 100, // Convert to kobo (smallest unit)
        account_number: payload.accountNumber,
        bank_code: payload.bankCode,
        narration: payload.narration,
        reference: payload.reference,
      });

      if (response.data.status) {
        logger.info('Transfer initiated successfully', {
          transactionId: response.data.data.transaction_id,
          reference: payload.reference,
        });
      }

      return response.data;
    } catch (error: any) {
      logger.error('Failed to initiate transfer:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get virtual account details
   */
  async getVirtualAccountDetails(accountNumber: string): Promise<any> {
    try {
      const response = await this.client.get(`/virtual-account/${accountNumber}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch virtual account details:', error.message);
      throw error;
    }
  }

  /**
   * Verify account details before transfer
   */
  async verifyAccount(accountNumber: string, bankCode: string): Promise<any> {
    try {
      const response = await this.client.get('/account/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (response.data.status) {
        logger.info('Account verified:', response.data.data);
      }

      return response.data;
    } catch (error: any) {
      logger.error('Failed to verify account:', error.message);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await this.client.get(`/transfer/${transactionId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch transaction status:', error.message);
      throw error;
    }
  }
}

export default new SquadService();
export { SquadService };
