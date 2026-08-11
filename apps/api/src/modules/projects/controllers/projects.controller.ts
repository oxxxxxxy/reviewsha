import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Ownership } from '../../../common/auth/decorators/ownership.decorator';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import { ApiStandardErrors } from '../../../common/swagger';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectFilterDto } from '../dto/project-filter.dto';
import {
  ProjectHistoryListResponseDto,
  ProjectResponseEnvelopeDto,
  ProjectsListResponseDto,
} from '../dto/project-response.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectsService } from '../services/projects.service';

@ApiTags('Projects')
@ApiBearerAuth('bearer')
@ApiStandardErrors()
@Roles(...AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.roles)
@Controller('projects')
export class ProjectsController {
  private readonly projectsService: ProjectsService;

  constructor(@Inject(ProjectsService) projectsService: ProjectsService) {
    this.projectsService = projectsService;
  }

  @Get()
  @ApiOperation({
    summary: 'List projects available to the current user',
    description: AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.description,
  })
  @ApiOkResponse({ type: ProjectsListResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: ProjectFilterDto,
  ): Promise<ProjectsListResponseDto> {
    return this.projectsService.findAll(user, filter);
  }

  @Get(':id')
  @Ownership('project')
  @ApiOperation({
    summary: 'Get a project by id',
    description: AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.description,
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiOkResponse({ type: ProjectResponseEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProjectResponseEnvelopeDto> {
    return this.projectsService.findById(user, id);
  }

  @Post()
  @Roles(...AUTHORIZATION_POLICIES.projects.create.roles)
  @ApiOperation({
    summary: 'Create a project',
    description: AUTHORIZATION_POLICIES.projects.create.description,
  })
  @ApiCreatedResponse({ type: ProjectResponseEnvelopeDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseEnvelopeDto> {
    return this.projectsService.create(user, dto);
  }

  @Patch(':id')
  @Roles(...AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.roles)
  @Ownership('project')
  @ApiOperation({
    summary: 'Update a project',
    description: AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.description,
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiOkResponse({ type: ProjectResponseEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiUnprocessableEntityResponse({ description: 'No project fields provided' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseEnvelopeDto> {
    return this.projectsService.update(user, id, dto);
  }

  @Post(':id/archive')
  @Roles(...AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.roles)
  @Ownership('project')
  @ApiOperation({
    summary: 'Archive a project',
    description: 'Archives a project owned by the current user or any project for an ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiOkResponse({ type: ProjectResponseEnvelopeDto })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProjectResponseEnvelopeDto> {
    return this.projectsService.archive(user, id);
  }

  @Post(':id/restore')
  @Roles(...AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.roles)
  @Ownership('project')
  @ApiOperation({
    summary: 'Restore an archived project',
    description:
      'Restores an archived project owned by the current user or any project for an ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiOkResponse({ type: ProjectResponseEnvelopeDto })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProjectResponseEnvelopeDto> {
    return this.projectsService.restore(user, id);
  }

  @Get(':id/history')
  @Ownership('project')
  @ApiOperation({
    summary: 'Get project change history',
    description:
      'Returns project lifecycle and field-change history for the current user or ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiOkResponse({ type: ProjectHistoryListResponseDto })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProjectHistoryListResponseDto> {
    return this.projectsService.history(user, id);
  }

  @Delete(':id')
  @Roles(...AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.roles)
  @Ownership('project')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a project',
    description: AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.description,
  })
  @ApiParam({ name: 'id', description: 'Project UUID.' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.projectsService.delete(user, id);
  }
}
