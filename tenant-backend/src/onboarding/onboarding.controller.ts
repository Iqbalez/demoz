import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { tenantStorage } from '../tenant-context';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * POST /onboarding/import-employees
   * Accepts a multipart CSV file upload and bulk-imports employees for the
   * currently authenticated tenant. SMS credentials are sent non-blocking.
   */
  @Post('import-employees')
  @UseInterceptors(FileInterceptor('file'))
  async importEmployees(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Res() res: any) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded. Send the CSV as multipart field "file".');
      }

      const allowedMimeTypes = ['text/csv', 'application/octet-stream', 'text/plain', 'application/vnd.ms-excel'];
      if (!allowedMimeTypes.some((t) => file.mimetype.includes(t.split('/')[1]))) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Please upload a CSV file.`,
        );
      }

      const tenantId = tenantStorage.getStore();
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Missing tenant context.' });
      }

      const result = await this.onboardingService.importEmployeesFromCSV(tenantId, file.buffer, req.user?.userId);

      return res.status(HttpStatus.OK).json({
        success: true,
        imported: result.imported,
        failed: result.failed,
        details: result.details,
        message: `Successfully imported ${result.imported} employee(s). ${result.failed} failed. Credential SMS messages are being delivered in the background.`,
      });
    } catch (err: any) {
      this.logger.error(`Employee import failed: ${err.message}`);
      if (err instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: err.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err.message || 'An unexpected error occurred during employee import.',
      });
    }
  }

  /**
   * GET /onboarding/status
   * Returns a summary of the tenant's employee onboarding state.
   */
  @Get('status')
  async getOnboardingStatus(@Res() res: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Missing tenant context.' });
    }

    const status = await this.onboardingService.getOnboardingStatus(tenantId);
    return res.status(HttpStatus.OK).json(status);
  }

  /**
   * POST /onboarding/reminder/:employeeId
   * Regenerates and resends login credentials to a specific employee via SMS.
   */
  @Post('reminder/:employeeId')
  async sendReminder(@Param('employeeId') employeeId: string, @Res() res: any) {
    try {
      const tenantId = tenantStorage.getStore();
      if (!tenantId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Missing tenant context.' });
      }

      await this.onboardingService.sendCredentialReminder(tenantId, employeeId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Credential reminder sent successfully.',
      });
    } catch (err: any) {
      this.logger.error(`Reminder failed for employee ${employeeId}: ${err.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err.message,
      });
    }
  }
}
