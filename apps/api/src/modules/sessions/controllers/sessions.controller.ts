import { Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import { ApiStandardErrors } from '../../../common/swagger';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SessionService } from '../services/session.service';

@ApiTags('Sessions')
@ApiBearerAuth('bearer')
@ApiStandardErrors()
@Controller('sessions')
export class SessionsController {
  constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

  @Get()
  @Roles(...AUTHORIZATION_POLICIES.sessions.readOwn.roles)
  @ApiOperation({
    summary: 'List active user sessions',
    description: AUTHORIZATION_POLICIES.sessions.readOwn.description,
  })
  @ApiOkResponse({
    type: SessionResponseDto,
    isArray: true,
    description: 'Active sessions for the current user.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid access token' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<SessionResponseDto[]> {
    return this.sessionService.listSessions(user.id, user.jti);
  }

  @Delete(':id')
  @Roles(...AUTHORIZATION_POLICIES.sessions.revokeOwn.roles)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke one session',
    description: AUTHORIZATION_POLICIES.sessions.revokeOwn.description,
  })
  @ApiParam({
    name: 'id',
    description: 'Session UUID.',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @ApiNoContentResponse({ description: 'Session revoked' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.sessionService.revokeSession(user.id, id);
  }
}
