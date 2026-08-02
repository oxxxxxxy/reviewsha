import { describe, expect, it, vi } from 'vitest';
import { UsersController } from '../../../../src/modules/users/controllers/users.controller';
import { UsersService } from '../../../../src/modules/users/services/users.service';
import { UserQueryDto } from '../../../../src/modules/users/dto/user-query.dto';

describe('UsersController', () => {
  it('delegates list endpoint to UsersService', async () => {
    const service = {
      findAll: vi
        .fn()
        .mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, pages: 0 } }),
    } as unknown as UsersService;
    const controller = new UsersController(service);

    await controller.findAll(new UserQueryDto());

    expect(service.findAll).toHaveBeenCalledOnce();
  });

  it('delegates create endpoint to UsersService', async () => {
    const service = { create: vi.fn().mockResolvedValue({ id: 'id' }) } as unknown as UsersService;
    const controller = new UsersController(service);

    await controller.create({
      email: 'developer@reviewsha.local',
      password: 'strong-password',
      displayName: 'Developer',
    });

    expect(service.create).toHaveBeenCalledOnce();
  });
});
