import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import type { SessionContext } from '../../sessions/interfaces/session-context.interface';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import { ApiStandardErrors } from '../../../common/swagger';
import { Public } from '../../../common/auth/decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshAuthGuard } from '../../../common/auth/guards/refresh-auth.guard';
import { AuthService } from '../services/auth.service';
import type {
  AuthenticatedRefreshUser,
  AuthenticatedUser,
} from '../../../common/auth/types/auth.types';

@ApiTags('Auth')
@ApiStandardErrors()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Public endpoint. Creates a user, stores an Argon2 password hash and returns a token pair.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email already exists' })
  register(@Body() dto: RegisterDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.toSessionContext(request));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Public endpoint. Validates credentials, creates a session and returns a token pair.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive user' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.toSessionContext(request));
  }

  @Post('logout')
  @Roles(...AUTHORIZATION_POLICIES.auth.logout.roles)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout current refresh token',
    description: AUTHORIZATION_POLICIES.auth.logout.description,
  })
  @ApiBody({ type: RefreshDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked token' })
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(user, dto.refreshToken);
  }

  @Post('logout-all')
  @Roles(...AUTHORIZATION_POLICIES.auth.logout.roles)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout all devices',
    description: AUTHORIZATION_POLICIES.auth.logout.description,
  })
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logoutAll(user);
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new token pair',
    description:
      'Public refresh endpoint protected by RefreshAuthGuard. Rotates the refresh token and revokes the old session token.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired or revoked refresh token' })
  refresh(
    @CurrentUser() user: AuthenticatedRefreshUser,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(user, this.toSessionContext(request));
  }

  @Get('me')
  @Roles(...AUTHORIZATION_POLICIES.auth.currentUser.roles)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get current user',
    description: AUTHORIZATION_POLICIES.auth.currentUser.description,
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid token or inactive user' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.me(user);
  }

  @Patch('me')
  @Roles(...AUTHORIZATION_POLICIES.auth.currentUser.roles)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Authenticated USER or ADMIN can update own profile fields.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid token or inactive user' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateMe(user, dto);
  }

  private toSessionContext(request: Request): SessionContext {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
