import * as argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { seedUsers } from '../../../prisma/seeds/constants';

describe('seed authentication credentials', () => {
  it.each([
    ['admin@reviewsha.local', 'admin-password'],
    ['developer@reviewsha.local', 'developer-password'],
    ['demo@reviewsha.local', 'demo-password'],
  ])('stores an AuthService-compatible password hash for %s', async (email, password) => {
    const user = seedUsers.find((candidate) => candidate.email === email);

    expect(user).toBeDefined();
    await expect(argon2.verify(user!.passwordHash, password)).resolves.toBe(true);
  });
});
