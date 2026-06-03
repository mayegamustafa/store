import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role, TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  // ── Public: open a support ticket ─────────────────────────────────────────
  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket (public)' })
  createTicket(
    @Body() body: {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
      category?: TicketCategory;
      orderId?: string;
    },
    @Request() req: any,
  ) {
    const userId = req?.user?.id;
    return this.supportService.createTicket({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      body: body.message,
      category: body.category,
      orderId: body.orderId,
      userId,
    });
  }

  // ── Public: customer reply via ticket link ─────────────────────────────────
  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'Customer reply to ticket' })
  customerReply(
    @Param('id') id: string,
    @Body() body: { message: string; name?: string; email?: string },
  ) {
    return this.supportService.customerReply(id, {
      body: body.message,
      name: body.name,
      email: body.email,
    });
  }

  // ── Admin: list all tickets ────────────────────────────────────────────────
  @Get('tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List support tickets (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'category', required: false, enum: TicketCategory })
  @ApiQuery({ name: 'search', required: false })
  listTickets(
    @Query('page') page?: number,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('category') category?: TicketCategory,
    @Query('search') search?: string,
  ) {
    return this.supportService.listTickets({ page, status, priority, category, search });
  }

  // ── Admin: stats ───────────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Support inbox stats (admin)' })
  getStats() {
    return this.supportService.getStats();
  }

  // ── Admin: get single ticket with full thread ──────────────────────────────
  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket detail with messages (admin)' })
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicket(id);
  }

  // ── Admin: staff reply ─────────────────────────────────────────────────────
  @Post('tickets/:id/staff-reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Staff reply to ticket (admin)' })
  staffReply(
    @Param('id') id: string,
    @Body() body: { message: string; attachments?: string[] },
    @Request() req: any,
  ) {
    return this.supportService.staffReply(id, {
      body: body.message,
      staffName: `${req.user?.firstName ?? 'Support'} Team`,
      staffId: req.user?.id,
      attachments: body.attachments,
    });
  }

  // ── Admin: update ticket (status, priority, assignee) ─────────────────────
  @Patch('tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket status / priority / assignee (admin)' })
  updateTicket(
    @Param('id') id: string,
    @Body() body: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      tags?: string[];
    },
  ) {
    return this.supportService.updateTicket(id, body);
  }
}
