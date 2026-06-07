import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { Logger } from '@nestjs/common';
import { BULL_WORKER_OPTIONS } from '../redis/redis.config';

@Processor('fayda-queue', BULL_WORKER_OPTIONS)
export class FaydaProcessor extends WorkerHost {
  private readonly logger = new Logger(FaydaProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Processes the asynchronous Fayda ID validation request.
   */
  async process(job: Job<any, any, string>): Promise<any> {
    const { phoneNumber, faydaNumber } = job.data;
    this.logger.log(`Starting background Fayda ID validation for Job ${job.id}`);

    // Simulate high-latency national identity registry API handshake (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 1. Enforce strict 12-digit regex check
    const faydaRegex = /^\d{12}$/;
    if (!faydaRegex.test(faydaNumber)) {
      const errorMsg = `Validation Failed: Fayda Number "${faydaNumber}" is not a valid 12-digit numeric string.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 2. Perform cross-tenant check of employee database records for duplicates
    const existing = await this.prisma.employee.findFirst({
      where: { faydaNumber },
    });

    if (existing && existing.phoneNumber !== phoneNumber) {
      const errorMsg = `Validation Failed: Fayda ID "${faydaNumber}" is already registered globally to phone "${existing.phoneNumber}".`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.logger.log(`Fayda National ID validation succeeded for Job ${job.id}`);
    return {
      success: true,
      phoneNumber,
      faydaNumber,
      verifiedAt: new Date().toISOString(),
    };
  }
}
