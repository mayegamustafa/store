import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename, extname, join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_FOLDER = 'totalstore';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly useCloudinary: boolean;

  constructor(private config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    this.useCloudinary = !!(cloudName && apiKey && apiSecret);

    if (this.useCloudinary) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      this.logger.log('Uploads → Cloudinary (persistent)');
    } else {
      this.logger.warn(
        'CLOUDINARY_* not configured — uploads stored on local disk. ' +
          'On Railway the disk is EPHEMERAL: files are lost on every redeploy.',
      );
    }
  }

  /** Public URL for a file saved by multer diskStorage (local-disk mode). */
  private localUrl(file: Express.Multer.File): string {
    const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3001';
    return `${baseUrl}/uploads/${basename(file.filename)}`;
  }

  /**
   * Persist an uploaded file and return its public URL.
   * Cloudinary when configured; local disk otherwise. On a Cloudinary failure
   * we keep the local file and serve that URL rather than failing the request.
   */
  async store(file: Express.Multer.File): Promise<string> {
    if (!this.useCloudinary) return this.localUrl(file);
    try {
      const res = await cloudinary.uploader.upload(file.path, {
        folder: CLOUDINARY_FOLDER,
        // Keep the multer-generated uuid as the public id so DB URLs stay stable
        public_id: basename(file.filename, extname(file.filename)),
        resource_type: 'auto',
      });
      this.safeUnlink(file.path);
      return res.secure_url;
    } catch (e: any) {
      this.logger.error(`Cloudinary upload failed (${e?.message || e}) — serving local file instead`);
      return this.localUrl(file);
    }
  }

  async storeMany(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.store(f)));
  }

  /** Back-compat aliases (older call sites) */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    return this.store(file);
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    return this.storeMany(files);
  }

  /** Delete a stored file by filename or full URL (local disk or Cloudinary). */
  async deleteFile(filenameOrUrl: string) {
    if (this.useCloudinary && filenameOrUrl.includes('res.cloudinary.com')) {
      const publicId = `${CLOUDINARY_FOLDER}/${basename(filenameOrUrl, extname(filenameOrUrl))}`;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (e: any) {
        this.logger.warn(`Cloudinary destroy failed for ${publicId}: ${e?.message || e}`);
      }
      return;
    }
    const name = basename(filenameOrUrl);
    const path = join(process.cwd(), 'uploads', name);
    if (existsSync(path)) unlinkSync(path);
  }

  private safeUnlink(path: string) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // best-effort temp cleanup
    }
  }
}
