import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get('products/:productId') getReviews(@Param('productId') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getProductReviews(id, page ? +page : 1, limit ? +limit : 20);
  }

  @Post('products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Param('productId') productId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createReview(userId, productId, dto);
  }
}
