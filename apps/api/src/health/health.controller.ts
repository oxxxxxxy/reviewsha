import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/auth/decorators/public.decorator';
import { HealthResponse, HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Public endpoint. Returns API and database availability.',
  })
  @ApiOkResponse({
    description: 'API health status.',
    schema: {
      example: {
        status: 'ok',
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Database connection is unavailable.',
  })
  getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
