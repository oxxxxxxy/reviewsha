import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponse, HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
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
