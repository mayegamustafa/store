import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findOne(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: { children: { where: { isActive: true } } },
    });
  }

  create(dto: any) {
    const slug = (dto.slug?.trim()) || dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { imageUrl, parentId, slug: _slug, ...rest } = dto;
    return this.prisma.category.create({
      data: {
        ...rest,
        slug,
        image: imageUrl || undefined,
        parentId: parentId || undefined,
      },
    });
  }

  update(id: string, dto: any) {
    const { imageUrl, parentId, slug, ...rest } = dto;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
        ...(imageUrl !== undefined ? { image: imageUrl || undefined } : {}),
        ...(parentId !== undefined ? { parentId: parentId || undefined } : {}),
        ...(slug ? { slug } : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
