import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UserMapper } from '../mappers/user.mapper';
import type { UserResponseDto, UsersListResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: ApiLoggerService,
  ) {}

  async findAll(query: UserQueryDto): Promise<UsersListResponseDto> {
    const page = query.page;
    const limit = query.limit;
    const result = await this.userRepository.findMany({
      page,
      limit,
      search: query.search?.trim() || undefined,
      sort: query.sort,
      order: query.order,
    });

    return {
      items: UserMapper.toResponseList(result.items),
      meta: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    return UserMapper.toResponse(await this.getUserOrThrow(id));
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.userRepository.create({
      email,
      passwordHash: await this.hashPassword(dto.password),
      displayName: dto.displayName.trim(),
    });

    this.logger.log(`User created: ${user.id}`, 'UsersService');
    return UserMapper.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.getUserOrThrow(id);

    const data: UpdateUserDto = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim();
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new UnprocessableEntityException('At least one field must be provided');
    }

    const user = await this.userRepository.update(id, data);
    this.logger.log(`User updated: ${user.id}`, 'UsersService');
    return UserMapper.toResponse(user);
  }

  async delete(id: string): Promise<void> {
    await this.getUserOrThrow(id);
    await this.userRepository.delete(id);
    this.logger.log(`User deleted: ${id}`, 'UsersService');
  }

  private async getUserOrThrow(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }
}
