import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshAuthGuard } from '../guards/refresh-auth.guard';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedRefreshUser, AuthenticatedUser } from '../types/auth.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email already exists' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive user' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked token' })
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(user, dto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logoutAll(user);
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired or revoked refresh token' })
  refresh(@CurrentUser() user: AuthenticatedRefreshUser): Promise<AuthResponseDto> {
    return this.authService.refresh(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid token or inactive user' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.me(user);
  }
}
