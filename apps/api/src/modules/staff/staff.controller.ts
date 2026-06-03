import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, ResetStaffPasswordDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role, StaffRole } from '@prisma/client';

@ApiTags('staff')
@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF)
@ApiBearerAuth()
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all staff roles with default permissions' })
  getRoles() {
    return this.staffService.getRolesManifest();
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new staff/company user' })
  create(@Body() dto: CreateStaffDto, @Request() req: any) {
    return this.staffService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff members' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('role') role?: StaffRole,
  ) {
    return this.staffService.findAll(+page, +limit, search, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff member details or role' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset a staff member password' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetStaffPasswordDto,
    @Request() req: any,
  ) {
    return this.staffService.resetPassword(id, dto, req.user.id);
  }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend a staff member' })
  suspend(@Param('id') id: string) {
    return this.staffService.suspend(id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reactivate a suspended staff member' })
  reactivate(@Param('id') id: string) {
    return this.staffService.reactivate(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove (soft-delete) a staff member' })
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
