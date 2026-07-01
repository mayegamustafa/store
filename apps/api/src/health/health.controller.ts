import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../modules/auth/decorators/public.decorator';

// VERSION_NEUTRAL so the route resolves at BOTH /api/health and /api/v1/health.
// Railway's healthcheck (apps/api/railway.json) probes /api/health without a
// version prefix; the API's global versioning would otherwise put it at
// /api/v1/health only.
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'TotalStore API',
      version: '1.0.0',
    };
  }
}
