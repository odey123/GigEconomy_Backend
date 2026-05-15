import axios, { AxiosInstance } from 'axios';
import config from '../config/config';
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

interface CreatePaymentLinkPayload {
  amount: number;
  customerId: string;
  reference: string;
  metadata: Record<string, any>;
}

interface AutoSplitEntry {
  accountNumber: string;
  bankCode: string;
  amount: number;
  narration: string;
}

interface CreateEscrowPayload {
  amount: number;
  customerId: string;
  reference: string;
  metadata: Record<string, any>;
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
    this.apiKey = config.squadApiKey;

    this.client = axios.create({
      baseURL: config.squadApiBaseUrl,
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

  /**
   * Create a payment link for a customer to pay
   * Uses Squad POST /transaction/initiate
   */
  async createPaymentLink(payload: CreatePaymentLinkPayload): Promise<SquadResponse<{
    authorization_url: string;
    reference: string;
  }>> {
    try {
      const customerEmail = payload.metadata?.customerEmail as string;
      if (!customerEmail) {
        throw new Error('customerEmail is required in metadata');
      }

      const response = await this.client.post('/transaction/initiate', {
        amount: payload.amount * 100, // convert to kobo
        email: customerEmail,
        currency: 'NGN',
        initiate_type: 'inline',
        transaction_ref: payload.reference,
        metadata: payload.metadata,
      });

      // Normalise Squad's response shape to our internal interface
      // Squad returns: { status: 200, success: true, data: { auth_url, transaction_ref } }
      const squadData = response.data;
      return {
        status: squadData.success === true,
        message: squadData.message || 'Payment link created',
        data: {
          authorization_url: squadData.data?.auth_url,
          reference: squadData.data?.transaction_ref ?? payload.reference,
        },
      };
    } catch (error: any) {
      logger.error('Failed to create payment link:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Configure auto-split for a payment reference.
   * Squad handles actual fund splitting via webhook events; this records the
   * intended split so the webhook handler has the config it needs.
   * The webhook handler (handleChargeSuccess) already applies the split stored
   * on the contract, so no additional Squad API call is required here.
   */
  async setupAutoSplit(reference: string, splits: AutoSplitEntry[]): Promise<void> {
    logger.info('Auto-split configured', {
      reference,
      splits: splits.map((s) => ({ accountNumber: s.accountNumber, amount: s.amount })),
    });
  }

  /**
   * Generate a QR code URL for a payment link.
   * Returns a URL that renders as a QR image — can be used directly in <img src>.
   */
  generateQRCode(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  }

  /**
   * Create an escrow hold for a task contract.
   * Squad has no native escrow API; the hold is tracked at the wallet balance level.
   * Returns a local reference that ContractService stores against the contract.
   */
  async createEscrow(payload: CreateEscrowPayload): Promise<SquadResponse<{
    reference: string;
  }>> {
    logger.info('Escrow created (platform-managed)', {
      reference: payload.reference,
      amount: payload.amount,
      customerId: payload.customerId,
    });

    return {
      status: true,
      message: 'Escrow created successfully',
      data: { reference: payload.reference },
    };
  }

  /**
   * Release escrow to helper by initiating a transfer via Squad
   * Uses POST /transfer
   */
  async releaseEscrow(
    escrowReference: string,
    accountNumber: string,
    bankCode: string,
    amount: number
  ): Promise<SquadResponse<{ reference: string; transaction_id: string }>> {
    try {
      const releaseReference = `REL_${escrowReference}_${Date.now()}`;

      const response = await this.client.post<SquadResponse<{
        transaction_id: string;
        status: string;
      }>>('/transfer', {
        amount: amount * 100, // convert to kobo
        account_number: accountNumber,
        bank_code: bankCode,
        narration: `Escrow release: ${escrowReference}`,
        reference: releaseReference,
      });

      if (response.data.status) {
        logger.info('Escrow released via transfer', {
          escrowReference,
          releaseReference,
          amount,
        });
      }

      return {
        status: response.data.status,
        message: response.data.message,
        data: {
          reference: releaseReference,
          transaction_id: response.data.data.transaction_id,
        },
      };
    } catch (error: any) {
      logger.error('Failed to release escrow:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default new SquadService();
export { SquadService };
