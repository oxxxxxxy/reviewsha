import {
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
} from '@nestjs/swagger';
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
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_SIZE_BYTES } }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
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
