import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';
import type { User } from '@reviewsha/types';

/** Request contracts are derived from the canonical OpenAPI artifact. */
export type LoginRequest = components['schemas']['LoginDto'];

export interface LoginResponse {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export type RegisterRequest = components['schemas']['RegisterDto'];

export interface UpdateProfileRequest {
  readonly displayName?: string;
  readonly avatarUrl?: string | null;
}

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export class AuthAPI {
  constructor(private readonly client: ApiClient) {}

  login(payload: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse, LoginRequest>('/auth/login', payload);
  }

  register(payload: RegisterRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse, RegisterRequest>('/auth/register', payload);
  }

  refresh(refreshToken: string): Promise<LoginResponse> {
    return this.client.post<LoginResponse, { refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
  }

  me(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }

  updateMe(payload: UpdateProfileRequest): Promise<User> {
    return this.client.patch<User, UpdateProfileRequest>('/auth/me', payload);
  }

  changePassword(payload: ChangePasswordRequest): Promise<void> {
    return this.client.post<void, ChangePasswordRequest>('/auth/change-password', payload);
  }

  logout(refreshToken: string): Promise<void> {
    return this.client.post<void, { refreshToken: string }>('/auth/logout', { refreshToken });
  }
}
