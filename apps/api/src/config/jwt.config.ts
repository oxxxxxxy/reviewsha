import type { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';

export type JwtAlgorithm = 'HS256' | 'RS256' | 'ES256';

export type JwtTokenKindConfig = {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
  algorithm: JwtAlgorithm;
};

export type JwtConfig = {
  access: JwtTokenKindConfig;
  refresh: JwtTokenKindConfig;
};

export function createJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const issuer = env.JWT_ISSUER ?? 'reviewsha-api';
  const audience = env.JWT_AUDIENCE ?? 'reviewsha-clients';
  const algorithm = (env.JWT_ALGORITHM ?? 'HS256') as JwtAlgorithm;

  return {
    access: {
      secret: env.JWT_SECRET ?? 'reviewsha-access-secret-change-me',
      expiresIn: env.JWT_EXPIRES_IN ?? '15m',
      issuer,
      audience,
      algorithm,
    },
    refresh: {
      secret: env.JWT_REFRESH_SECRET ?? 'reviewsha-refresh-secret-change-me',
      expiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '30d',
      issuer,
      audience,
      algorithm,
    },
  };
}

export function toJwtSignOptions(config: JwtTokenKindConfig): JwtSignOptions {
  return {
    secret: config.secret,
    expiresIn: config.expiresIn as JwtSignOptions['expiresIn'],
    issuer: config.issuer,
    audience: config.audience,
    algorithm: config.algorithm,
  };
}

export function toJwtVerifyOptions(config: JwtTokenKindConfig): JwtVerifyOptions {
  return {
    secret: config.secret,
    issuer: config.issuer,
    audience: config.audience,
    algorithms: [config.algorithm],
  };
}
