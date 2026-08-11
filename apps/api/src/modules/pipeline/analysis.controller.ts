import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../common/authorization';
import type { AuthenticatedUser } from '../../common/auth/types/auth.types';
import { AnalysisResponseDto, AnalysesListResponseDto } from './dto/analysis-response.dto';
import { AnalysisService } from './analysis.service';

@ApiTags('Analysis')
@ApiBearerAuth('bearer')
@Roles(...AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.roles)
@Controller('projects/:projectId/analyses')
export class AnalysisController {
  private readonly analyses: AnalysisService;

  constructor(@Inject(AnalysisService) analyses: AnalysisService) {
    this.analyses = analyses;
  }

  @Get()
  @ApiOperation({ summary: 'List project analyses' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: AnalysesListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<AnalysesListResponseDto> {
    return this.analyses.list(user, projectId, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Start analysis for the latest or selected upload' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiCreatedResponse({ type: AnalysisResponseDto })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('uploadId') uploadId?: string,
    @Query('language') language?: string,
  ): Promise<{ data: AnalysisResponseDto }> {
    return this.analyses.start(user, projectId, uploadId, language === 'en' ? 'en' : 'ru');
  }
}
