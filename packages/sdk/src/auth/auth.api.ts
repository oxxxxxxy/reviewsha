import type { User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface LoginResponse {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface RegisterRequest extends LoginRequest {
  readonly displayName: string;
}

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
