import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminAiSettingsResponseDto {
  @ApiProperty({ example: 'deepseek' }) provider!: string;
  @ApiProperty({ example: 'http://localhost:20128/v1' }) baseUrl!: string;
  @ApiProperty({ example: 'auto/best-coding' }) model!: string;
  @ApiProperty({ example: true }) apiKeyConfigured!: boolean;
  @ApiPropertyOptional({ example: 'sk-••••••••7b2e', nullable: true }) apiKeyMasked!: string | null;
  @ApiProperty({ example: 4000 }) maxTokens!: number;
  @ApiProperty({ example: 0.2 }) temperature!: number;
  @ApiProperty({ example: 60000 }) timeoutMs!: number;
  @ApiProperty({ example: 3 }) retryAttempts!: number;
  @ApiProperty({ example: 3 }) maxConcurrency!: number;
  @ApiProperty({ type: [String] }) availableModels!: string[];
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) updatedAt!:
    string | null;
}

export class UpdateAdminAiSettingsDto {
  @ApiPropertyOptional({ example: 'deepseek' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @ApiPropertyOptional({ example: 'http://localhost:20128/v1' })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'auto/best-coding' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  model?: string;

  @ApiPropertyOptional({ description: 'A new key. It is encrypted at rest and never returned.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean;

  @ApiPropertyOptional({ example: 4000, minimum: 128, maximum: 128000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(128)
  @Max(128000)
  maxTokens?: number;

  @ApiPropertyOptional({ example: 0.2, minimum: 0, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 60000, minimum: 1000, maximum: 600000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(600000)
  timeoutMs?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  retryAttempts?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 32 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32)
  maxConcurrency?: number;
}

export class AdminAiConnectionResponseDto {
  @ApiProperty({ example: true }) ok!: boolean;
  @ApiProperty({ example: 'OmniRoute is reachable' }) message!: string;
  @ApiProperty({ example: 28 }) modelsCount!: number;
  @ApiProperty({ example: 342 }) latencyMs!: number;
  @ApiProperty({ example: 'auto/best-coding' }) model!: string;
}

export class AdminAiModelsResponseDto {
  @ApiProperty({ type: [String] }) models!: string[];
}
