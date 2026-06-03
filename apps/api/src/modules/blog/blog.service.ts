import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  private slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  findPublished(params: { page?: number; limit?: number; category?: string; tag?: string }) {
    const { page = 1, limit = 12, category, tag } = params;
    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };
    if (category) where.category = category;
    if (tag) where.tags = { has: tag };

    return Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.blogPost.count({ where }),
    ]).then(([posts, total]) => ({
      data: posts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }));
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    if (!post || !post.isPublished) throw new NotFoundException('Post not found');
    return post;
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  adminFindAll(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    return Promise.all([
      this.prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.blogPost.count(),
    ]).then(([posts, total]) => ({
      data: posts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }));
  }

  async create(dto: any, authorId: string) {
    const slug = dto.slug?.trim() || this.slugify(dto.title);
    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        category: dto.category,
        tags: dto.tags || [],
        authorId,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    const wasPublished = existing.isPublished;
    const nowPublished = dto.isPublished ?? existing.isPublished;

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.slug?.trim() || (dto.title ? this.slugify(dto.title) : existing.slug),
        publishedAt: !wasPublished && nowPublished ? new Date() : existing.publishedAt,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.blogPost.findUniqueOrThrow({ where: { id } });
    return this.prisma.blogPost.delete({ where: { id } });
  }
}
