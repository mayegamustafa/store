import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename, join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  /** Returns the public URL for a file already saved by multer diskStorage */
  fileUrl(file: Express.Multer.File): string {
    const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3001';
    return `${baseUrl}/uploads/${basename(file.filename)}`;
  }

  fileUrls(files: Express.Multer.File[]): string[] {
    return files.map((f) => this.fileUrl(f));
  }

  /** Back-compat alias */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    return this.fileUrl(file);
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    return this.fileUrls(files);
  }

  /** Delete a local file by its filename or full URL basename */
  deleteFile(filenameOrUrl: string) {
    const name = basename(filenameOrUrl);
    const path = join(process.cwd(), 'uploads', name);
    if (existsSync(path)) unlinkSync(path);
  }
}
