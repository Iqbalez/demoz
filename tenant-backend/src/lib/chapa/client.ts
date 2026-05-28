import axios, { AxiosInstance } from 'axios';

export type ChapaBulkRecipient = {
  account_name: string;
  account_number: string;
  amount: number;
  reference: string;
  bank_code: number | string;
};

export type ChapaBulkTransferResponse = {
  status: string;
  message?: string;
  data?: {
    id?: string | number;
    batch_id?: string | number;
    [k: string]: unknown;
  };
};

export class ChapaClient {
  private readonly http: AxiosInstance;

  constructor(private readonly secretKey: string, baseUrl = 'https://api.chapa.co/v1') {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initiateBulkTransfer(params: {
    title: string;
    currency: 'ETB';
    bulk_data: ChapaBulkRecipient[];
  }): Promise<{ batchId: string; raw: ChapaBulkTransferResponse }> {
    const res = await this.http.post<ChapaBulkTransferResponse>('/bulk-transfers', params);
    const batchId =
      (res.data?.data?.id ?? res.data?.data?.batch_id ?? '').toString();

    if (!batchId) {
      throw new Error(`Chapa bulk transfer returned no batch id. status=${res.data?.status}`);
    }

    return { batchId, raw: res.data };
  }

  async getTransferStatus(batchId: string) {
    const res = await this.http.get('/transfers', { params: { batch_id: batchId } });
    return res.data;
  }
}

