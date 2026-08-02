import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/auth.types';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SessionService } from '../services/session.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'List active user sessions' })
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Invalid access token' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<SessionResponseDto[]> {
    return this.sessionService.listSessions(user.id, user.jti);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke one session' })
  @ApiNoContentResponse({ description: 'Session revoked' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.sessionService.revokeSession(user.id, id);
  }
}
