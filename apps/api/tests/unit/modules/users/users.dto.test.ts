import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserDto } from '../../../../src/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../../src/modules/users/dto/update-user.dto';
import { UserQueryDto } from '../../../../src/modules/users/dto/user-query.dto';

describe('Users DTO validation', () => {
  it('accepts a valid CreateUserDto', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'developer@reviewsha.local',
      password: 'strong-password',
      displayName: 'Developer',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'invalid',
      password: 'strong-password',
      displayName: 'Developer',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects short password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'developer@reviewsha.local',
      password: 'short',
      displayName: 'Developer',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects short displayName', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'developer@reviewsha.local',
      password: 'strong-password',
      displayName: 'D',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('transforms query pagination values', async () => {
    const dto = plainToInstance(UserQueryDto, {
      page: '2',
      limit: '10',
      sort: 'email',
      order: 'asc',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('rejects invalid sort field', async () => {
    const dto = plainToInstance(UserQueryDto, { sort: 'passwordHash' });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts valid UpdateUserDto', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: 'Updated',
      avatarUrl: 'https://cdn.reviewsha.local/avatar.png',
      isActive: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
