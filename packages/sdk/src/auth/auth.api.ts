import type { AuthTokens, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface LoginResponse {
  readonly user: User;
  readonly tokens: AuthTokens;
}

export class AuthAPI {
  constructor(private readonly client: ApiClient) {}

  login(payload: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse, LoginRequest>('/auth/login', payload);
  }

  me(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }

  logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }
}
