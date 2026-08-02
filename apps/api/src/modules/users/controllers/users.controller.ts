import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UserResponseDto, UsersListResponseDto } from '../dto/user-response.dto';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { AUTHORIZATION_POLICIES } from '../../../common/authorization';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@Roles(...AUTHORIZATION_POLICIES.users.manage.roles)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with pagination, search and sorting',
    description: AUTHORIZATION_POLICIES.users.read.description,
  })
  @ApiOkResponse({ type: UsersListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: UserQueryDto): Promise<UsersListResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by id',
    description: AUTHORIZATION_POLICIES.users.read.description,
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user id' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create user',
    description: AUTHORIZATION_POLICIES.users.manage.description,
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiConflictResponse({ description: 'Email already exists' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: AUTHORIZATION_POLICIES.users.manage.description,
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user id or payload' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'No update fields provided' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: AUTHORIZATION_POLICIES.users.manage.description,
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiBadRequestResponse({ description: 'Invalid user id' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.usersService.delete(id);
  }
}
