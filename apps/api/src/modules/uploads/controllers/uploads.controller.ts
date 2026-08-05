import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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

@ApiTags('Uploads')
@ApiBearerAuth('bearer')
@Roles(...AUTHORIZATION_POLICIES.projects.readOwnOrAdmin.roles)
@Controller('projects/:projectId/uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post()
  @Roles(...AUTHORIZATION_POLICIES.projects.create.roles)
  @Ownership('project')
  @ApiOperation({ summary: 'Upload a ZIP archive for a project' })
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
        filename: (_request, _file, callback) => callback(null, `${randomUUID()}.zip`),
      }),
      limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('A ZIP file is required');
    return this.service.create(user, projectId, file);
  }

  @Get()
  @Ownership('project')
  @ApiOperation({ summary: 'List project upload versions' })
  @ApiOkResponse({ type: UploadListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<UploadListResponseDto> {
    return this.service.list(user, projectId);
  }
}
