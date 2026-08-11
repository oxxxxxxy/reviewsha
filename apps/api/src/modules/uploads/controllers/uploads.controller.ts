import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Ownership } from '../../../common/auth/decorators/ownership.decorator';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { UPLOAD_MAX_SIZE_BYTES } from '../constants/upload.constants';
import { UploadListResponseDto, UploadResponseDto } from '../dto/upload-response.dto';
import { UploadsService } from '../services/uploads.service';
import { GithubImportDto } from '../dto/github-import.dto';

@ApiTags('Uploads')
@ApiBearerAuth('bearer')
@Roles(...AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.roles)
@Controller('projects/:projectId/uploads')
export class UploadsController {
  private readonly service: UploadsService;

  constructor(@Inject(UploadsService) service: UploadsService) {
    this.service = service;
  }

  @Post()
  @Roles(...AUTHORIZATION_POLICIES.projects.create.roles)
  @Ownership('project', 'projectId')
  @ApiOperation({ summary: 'Upload a project archive, source file, document, or PDF' })
  @ApiParam({ name: 'projectId', description: 'Project UUID.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file or invalid project identifier.' })
  @ApiForbiddenResponse({ description: 'The current user cannot access this project.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @ApiUnprocessableEntityResponse({ description: 'The archive failed validation.' })
  @ApiServiceUnavailableResponse({ description: 'Object storage is unavailable.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_request, file, callback) => {
          const extension = file.originalname.match(/\.[a-z0-9.]+$/i)?.[0]?.toLowerCase() ?? '.bin';
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('A supported archive or readable file is required');
    return this.service.create(user, projectId, file);
  }

  @Get()
  @Ownership('project', 'projectId')
  @ApiOperation({ summary: 'List project upload versions' })
  @ApiOkResponse({ type: UploadListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<UploadListResponseDto> {
    return this.service.list(user, projectId);
  }

  @Delete(':uploadId')
  @Ownership('project', 'projectId')
  @ApiOperation({ summary: 'Delete a local project version' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('uploadId', new ParseUUIDPipe()) uploadId: string,
  ): Promise<void> {
    return this.service.remove(user, projectId, uploadId);
  }

  @Post('github')
  @Ownership('project', 'projectId')
  @ApiOperation({
    summary: 'Import recent commits from a public GitHub repository as immutable versions',
  })
  importGithub(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: GithubImportDto,
  ): Promise<UploadListResponseDto> {
    return this.service.importGithub(user, projectId, dto);
  }
}
