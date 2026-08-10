import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';
import type { Role } from '@reviewsha/types';

/** Request contracts are derived from the canonical OpenAPI artifact. */
export type LoginRequest = components['schemas']['LoginDto'];

/** Generated user fields with the shared domain Role enum at the app boundary. */
export type ApiUser = Omit<
  components['schemas']['UserResponseDto'],
  'role' | 'displayName' | 'isActive'
> & {
  role: Role;
  displayName?: string;
  isActive?: boolean;
};
export type LoginResponse = Omit<components['schemas']['AuthResponseDto'], 'user'> & {
  user: ApiUser;
};

export type RegisterRequest = components['schemas']['RegisterDto'];

export interface UpdateProfileRequest {
  readonly displayName?: string;
  readonly avatarUrl?: string | null;
}

export type ChangePasswordRequest = components['schemas']['ChangePasswordDto'];

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

  me(): Promise<ApiUser> {
    return this.client.get<ApiUser>('/auth/me');
  }

  updateMe(payload: UpdateProfileRequest): Promise<ApiUser> {
    return this.client.patch<ApiUser, UpdateProfileRequest>('/auth/me', payload);
  }

  changePassword(payload: ChangePasswordRequest): Promise<void> {
    return this.client.post<void, ChangePasswordRequest>('/auth/change-password', payload);
  }

  logout(refreshToken: string): Promise<void> {
    return this.client.post<void, { refreshToken: string }>('/auth/logout', { refreshToken });
  }
}
