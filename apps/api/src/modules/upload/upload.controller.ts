import { Controller, Post, Delete, Query, UseInterceptors, UploadedFile, UploadedFiles, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB for videos

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    this.validateFile(file);
    const url = await this.uploadService.store(file);
    return { url };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiConsumes('multipart/form-data')
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files provided');
    files.forEach((f) => this.validateFile(f));
    const urls = await this.uploadService.storeMany(files);
    return { urls };
  }

  @Delete('file')
  async deleteFile(@Query('filename') filename: string) {
    if (!filename) throw new BadRequestException('Filename required');
    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
    await this.uploadService.deleteFile(filename);
    return { ok: true };
  }

  private validateFile(file: Express.Multer.File) {
    const isImage = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/i.test(file.mimetype);
    const isVideo = /^video\/(mp4|webm|quicktime|x-msvideo)$/i.test(file.mimetype);
    const isPdf = file.mimetype === 'application/pdf';

    if (!isImage && !isVideo && !isPdf) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed. Allowed: images, videos, PDF`);
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Image files must be under 10 MB');
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Video files must be under 100 MB');
    }
  }
}
