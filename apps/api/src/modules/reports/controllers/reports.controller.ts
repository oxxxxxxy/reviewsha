import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ReportsListDto, ReportResponseDto } from '../dto/report-response.dto';
import { ReportsService } from '../services/reports.service';
import type { Response } from 'express';
import { ParseIntPipe } from '@nestjs/common';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('reports/compare')
  @ApiOperation({ summary: 'Compare two report versions' })
  compare(
    @CurrentUser() user: AuthenticatedUser,
    @Query('oldReportId', ParseUUIDPipe) oldReportId: string,
    @Query('newReportId', ParseUUIDPipe) newReportId: string,
  ) {
    return this.service.compare(user, oldReportId, newReportId);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get a report' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: ReportResponseDto })
  @ApiNotFoundResponse()
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(user, id);
  }
  @Get('projects/:id/reports')
  @ApiOperation({ summary: 'List project reports' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: ReportsListDto })
  findByProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.service.findByProject(user, id, page, limit);
  }
  @Get('reports/:id/status')
  @ApiOperation({ summary: 'Get report generation status' })
  @ApiOkResponse({ type: ReportResponseDto })
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(user, id);
  }
  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report' })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove(user, id);
  }

  @Get('reports/:id/export/:format')
  @ApiOperation({ summary: 'Export and persist a report as Markdown, JSON, or PDF' })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('format') format: 'md' | 'json' | 'pdf',
    @Res() response: Response,
  ): Promise<void> {
    if (format !== 'md' && format !== 'json' && format !== 'pdf') {
      response.status(HttpStatus.BAD_REQUEST).json({ message: 'Format must be md, json or pdf' });
      return;
    }
    const file = await this.service.export(user, id, format);
    response.type(file.contentType).attachment(file.filename).send(file.body);
  }
}
