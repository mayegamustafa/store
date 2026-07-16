import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ImprovmxService } from './improvmx.service';

@ApiTags('email')
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth()
export class EmailController {
  constructor(private improvmx: ImprovmxService) {}

  @Get('status')
  @ApiOperation({ summary: 'Provider connection + domain status (admin)' })
  status() {
    return this.improvmx.getStatus();
  }

  @Get('dns')
  @ApiOperation({ summary: 'DNS / MX / SPF verification (admin)' })
  dns() {
    return this.improvmx.checkDns();
  }

  @Get('aliases')
  @ApiOperation({ summary: 'List email aliases (admin)' })
  aliases() {
    return this.improvmx.listAliases();
  }

  @Post('aliases')
  @ApiOperation({ summary: 'Create email alias (admin)' })
  createAlias(@Body() dto: { alias: string; forward: string }) {
    return this.improvmx.createAlias(dto.alias?.trim().toLowerCase(), dto.forward?.trim());
  }

  @Put('aliases/:alias')
  @ApiOperation({ summary: 'Update alias forward destination (admin)' })
  updateAlias(@Param('alias') alias: string, @Body() dto: { forward: string }) {
    return this.improvmx.updateAlias(alias, dto.forward?.trim());
  }

  @Delete('aliases/:alias')
  @ApiOperation({ summary: 'Delete email alias (admin)' })
  deleteAlias(@Param('alias') alias: string) {
    return this.improvmx.deleteAlias(alias);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Email forwarding logs (admin)' })
  logs() {
    return this.improvmx.getLogs();
  }
}
