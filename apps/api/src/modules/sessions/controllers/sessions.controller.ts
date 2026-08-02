import { Controller, Delete, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SessionService } from '../services/session.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @Roles(...AUTHORIZATION_POLICIES.sessions.readOwn.roles)
  @ApiOperation({
    summary: 'List active user sessions',
    description: AUTHORIZATION_POLICIES.sessions.readOwn.description,
  })
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
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
  @ApiNoContentResponse({ description: 'Session revoked' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.sessionService.revokeSession(user.id, id);
  }
}
