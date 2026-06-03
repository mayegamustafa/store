import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['price_asc','price_desc','rating','newest','bestseller'] })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  getFeatured() {
    return this.productsService.getFeatured();
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Search autocomplete' })
  autocomplete(@Query('q') q: string) {
    return this.productsService.autocomplete(q);
  }

  @Post('ai-description')
  @ApiOperation({ summary: 'Generate AI product description' })
  aiDescription(@Body() dto: { name: string; brand?: string; category?: string; tags?: string[]; condition?: string }) {
    return this.productsService.generateDescription(dto).then((description) => ({ description }));
  }

  // ── Seller: list own products ────────────────────────────────────────────────
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seller: list own products' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: any,
  ) {
    return this.productsService.findMySeller(userId, query);
  }

  // ── Admin-only: list all products regardless of status ─────────────────────
  @Get('admin-list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list all products (any status)' })
  adminList(@Query() query: any) {
    return this.productsService.adminFindAll(query);
  }

  // ── Admin-only: create product on behalf of a seller ──────────────────────
  @Post('admin-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: create product for any seller' })
  adminCreate(@Body() dto: any) {
    return this.productsService.adminCreate(dto);
  }

  // ── Admin-only: get single product by UUID ──────────────────────────────────
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: get product by ID' })
  adminFindOne(@Param('id') id: string) {
    return this.productsService.adminFindOne(id);
  }

  // ── Admin-only: update any product ────────────────────────────────────────
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: update any product' })
  adminUpdate(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.adminUpdate(id, dto);
  }

  // ── Admin-only: quick stock update ────────────────────────────────────────
  @Patch('admin/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: quick stock update (set or add)' })
  adminUpdateStock(@Param('id') id: string, @Body() dto: { stock?: number; addStock?: number; lowStockAlert?: number }) {
    return this.productsService.adminUpdateStock(id, dto);
  }

  // ── Admin-only: delete any product ────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: delete product' })
  remove(@Param('id') id: string) {
    return this.productsService.adminDelete(id);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Related products (same category)' })
  findRelated(@Param('slug') slug: string, @Query('limit') limit?: number) {
    return this.productsService.findRelated(slug, limit ? Number(limit) : 8);
  }

  @Get(':slug/bought-together')
  @ApiOperation({ summary: 'Frequently bought together' })
  findFrequentlyBought(@Param('slug') slug: string) {
    return this.productsService.findFrequentlyBought(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product details' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (seller)' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.productsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (seller)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.productsService.update(id, userId, dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve product (admin)' })
  approve(@Param('id') id: string) {
    return this.productsService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject product (admin)' })
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.productsService.reject(id, reason);
  }
}
