import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
// csv-parser ships as a CommonJS default export; require() is the safe cross-version pattern
// eslint-disable-next-line @typescript-eslint/no-var-requires
const csvParser = require('csv-parser') as () => NodeJS.ReadWriteStream;

export interface ParsedEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  errors?: string[];
}

const REQUIRED_COLUMNS = ['firstName', 'lastName', 'email', 'phone', 'department'];

@Injectable()
export class CsvParserService {
  async parseEmployeeCSV(csvBuffer: Buffer): Promise<ParsedEmployee[]> {
    const rows: ParsedEmployee[] = [];
    const seenEmails = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(csvBuffer.toString('utf8'));
      let headersChecked = false;

      stream
        .pipe(csvParser())
        .on('headers', (headers: string[]) => {
          headersChecked = true;
          const normalised = headers.map((h) => h.trim());
          const missing = REQUIRED_COLUMNS.filter((col) => !normalised.includes(col));
          if (missing.length > 0) {
            reject(
              new BadRequestException(
                `CSV must have columns: firstName, lastName, email, phone, department. Missing: ${missing.join(', ')}`,
              ),
            );
          }
        })
        .on('data', (row: Record<string, string>) => {
          const errors: string[] = [];

          const firstName = (row.firstName || '').trim();
          const lastName  = (row.lastName  || '').trim();
          const email     = (row.email     || '').trim();
          const phone     = (row.phone     || '').trim();
          const department= (row.department|| '').trim();

          if (!firstName)    errors.push('firstName is empty');
          if (!lastName)     errors.push('lastName is empty');
          if (!email)        errors.push('email is empty');
          else if (!email.includes('@')) errors.push('email is invalid');
          if (!phone)        errors.push('phone is empty');
          else if (phone.replace(/\D/g, '').length < 9) errors.push('phone must be at least 9 digits');
          if (!department)   errors.push('department is empty');

          // Duplicate email detection within the same upload
          if (email && seenEmails.has(email.toLowerCase())) {
            errors.push(`duplicate email in CSV: ${email}`);
          } else if (email) {
            seenEmails.add(email.toLowerCase());
          }

          rows.push({ firstName, lastName, email, phone, department, errors: errors.length ? errors : undefined });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      throw new BadRequestException('CSV must contain at least one employee');
    }

    return rows;
  }
}
