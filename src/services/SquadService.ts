import axios, { AxiosInstance } from 'axios';
import config from '../config/config';
import logger from '../utils/logger';

// Merchant ID prefix required by Squad for transfer references
const MERCHANT_ID = 'SBQMKZ5ZV3';

interface CreateVirtualAccountPayload {
  customerId: string;
  bvn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  mobileNum: string;
  dateOfBirth: string; // mm/dd/yyyy
  gender: string;      // '1' = Male, '2' = Female
  address: string;
  beneficiaryAccount?: string;
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
   * Build a transfer reference prefixed with merchant ID as required by Squad
   */
  private buildTransferRef(ref: string): string {
    return `${MERCHANT_ID}_${ref}`;
  }

  /**
   * Create a virtual account with BVN verification
   * POST /virtual-account
   */
  async createVirtualAccount(payload: CreateVirtualAccountPayload): Promise<any> {
    try {
      const response = await this.client.post<SquadResponse<{
        id: string;
        account_number: string;
        account_name: string;
        bank_code: string;
        bank_name: string;
      }>>('/virtual-account', {
        customer_identifier: payload.customerId,
        first_name: payload.firstName,
        last_name: payload.lastName,
        ...(payload.middleName && { middle_name: payload.middleName }),
        mobile_num: payload.mobileNum,
        dob: payload.dateOfBirth,
        email: payload.email,
        bvn: payload.bvn,
        gender: payload.gender,
        address: payload.address,
        ...(payload.beneficiaryAccount && { beneficiary_account: payload.beneficiaryAccount }),
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
   * Initiate a bank transfer (withdrawal/payout)
   * POST /payout/transfer
   */
  async transfer(payload: TransferPayload): Promise<any> {
    try {
      const reference = this.buildTransferRef(payload.reference);

      const response = await this.client.post<SquadResponse<{
        transaction_reference: string;
        status: string;
      }>>('/payout/transfer', {
        amount: payload.amount * 100, // kobo
        account_number: payload.accountNumber,
        bank_code: payload.bankCode,
        narration: payload.narration,
        transaction_reference: reference,
        currency_id: 'NGN',
      });

      if (response.data.status) {
        logger.info('Transfer initiated successfully', { reference });
      }

      return response.data;
    } catch (error: any) {
      logger.error('Failed to initiate transfer:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get virtual account details by account number
   * GET /virtual-account/customer/:accountNumber
   */
  async getVirtualAccountDetails(accountNumber: string): Promise<any> {
    try {
      const response = await this.client.get(`/virtual-account/customer/${accountNumber}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch virtual account details:', error.message);
      throw error;
    }
  }

  /**
   * Verify/lookup a bank account before transfer
   * POST /payout/account/lookup
   */
  async verifyAccount(accountNumber: string, bankCode: string): Promise<any> {
    try {
      const response = await this.client.post('/payout/account/lookup', {
        account_number: accountNumber,
        bank_code: bankCode,
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
   * Verify payment transaction status
   * GET /transaction/verify/:transaction_ref
   */
  async getTransactionStatus(transactionRef: string): Promise<any> {
    try {
      const response = await this.client.get(`/transaction/verify/${transactionRef}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch transaction status:', error.message);
      throw error;
    }
  }

  /**
   * Requery payout/transfer status
   * POST /payout/requery
   */
  async requeryTransfer(transactionReference: string): Promise<any> {
    try {
      const response = await this.client.post('/payout/requery', {
        transaction_reference: transactionReference,
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to requery transfer:', error.message);
      throw error;
    }
  }

  /**
   * Create a payment checkout link for a customer
   * POST /transaction/initiate
   * Returns checkout_url (not auth_url)
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
        amount: payload.amount * 100, // kobo
        email: customerEmail,
        currency: 'NGN',
        initiate_type: 'inline',
        transaction_ref: payload.reference,
        metadata: payload.metadata,
      });

      // Squad returns: { status: 200, success: true, data: { checkout_url, transaction_ref } }
      const squadData = response.data;
      return {
        status: squadData.success === true,
        message: squadData.message || 'Payment link created',
        data: {
          authorization_url: squadData.data?.checkout_url ?? squadData.data?.auth_url,
          reference: squadData.data?.transaction_ref ?? payload.reference,
        },
      };
    } catch (error: any) {
      logger.error('Failed to create payment link:', error.message);
      throw new Error(`Squad API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Auto-split is handled via webhook; just log the config here
   */
  async setupAutoSplit(reference: string, splits: AutoSplitEntry[]): Promise<void> {
    logger.info('Auto-split configured', {
      reference,
      splits: splits.map((s) => ({ accountNumber: s.accountNumber, amount: s.amount })),
    });
  }

  /**
   * QR code URL for a payment link
   */
  generateQRCode(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  }

  /**
   * Platform-managed escrow (Squad has no native escrow)
   */
  async createEscrow(payload: CreateEscrowPayload): Promise<SquadResponse<{ reference: string }>> {
    logger.info('Escrow created (platform-managed)', {
      reference: payload.reference,
      amount: payload.amount,
    });
    return {
      status: true,
      message: 'Escrow created successfully',
      data: { reference: payload.reference },
    };
  }

  /**
   * Release escrow by paying helper via Squad payout
   * POST /payout/transfer
   */
  async releaseEscrow(
    escrowReference: string,
    accountNumber: string,
    bankCode: string,
    amount: number
  ): Promise<SquadResponse<{ reference: string; transaction_id: string }>> {
    try {
      const releaseRef = this.buildTransferRef(`REL_${escrowReference}_${Date.now()}`);

      const response = await this.client.post<SquadResponse<{
        transaction_reference: string;
        status: string;
      }>>('/payout/transfer', {
        amount: amount * 100, // kobo
        account_number: accountNumber,
        bank_code: bankCode,
        narration: `Escrow release: ${escrowReference}`,
        transaction_reference: releaseRef,
        currency_id: 'NGN',
      });

      if (response.data.status) {
        logger.info('Escrow released via payout transfer', { escrowReference, releaseRef, amount });
      }

      return {
        status: response.data.status,
        message: response.data.message,
        data: {
          reference: releaseRef,
          transaction_id: response.data.data?.transaction_reference || releaseRef,
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
