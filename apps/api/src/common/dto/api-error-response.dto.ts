import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetailsDto {
  @ApiProperty({ type: Number, example: 400, description: 'HTTP status code.' })
  statusCode!: number;

  @ApiProperty({ type: String, example: 'Bad Request', description: 'Short error name.' })
  error!: string;

  @ApiProperty({
    type: String,
    example: 'Validation failed',
    description: 'Human-readable error message.',
  })
  message!: string;

  @ApiProperty({
    type: String,
    example: '/api/v1/users',
    description: 'Request path that produced the error.',
  })
  path!: string;

  @ApiProperty({
    type: String,
    example: '2026-08-02T20:00:00.000Z',
    description: 'UTC error timestamp.',
  })
  timestamp!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: Boolean, example: false, description: 'Always false for error responses.' })
  success!: boolean;

  @ApiProperty({ type: ApiErrorDetailsDto, description: 'Normalized API error payload.' })
  error!: ApiErrorDetailsDto;

  @ApiPropertyOptional({
    type: String,
    example: 'req_01JABCDE1234567890',
    description: 'Optional request correlation id when request tracing is enabled.',
  })
  requestId?: string;
}
