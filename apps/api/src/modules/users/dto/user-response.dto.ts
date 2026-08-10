import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ type: String, example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ type: String, example: 'developer@reviewsha.local' })
  email!: string;

  @ApiProperty({ type: String, example: 'Developer' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'https://cdn.reviewsha.local/avatars/user.png',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({ type: String, enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty({ type: Boolean, example: true })
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-02T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-02T12:00:00.000Z' })
  updatedAt!: string;
}

export class UsersListMetaDto {
  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 135 })
  total!: number;

  @ApiProperty({ type: Number, example: 7 })
  pages!: number;
}

@ApiExtraModels(UserResponseDto, UsersListMetaDto)
export class UsersListResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ type: () => UsersListMetaDto })
  meta!: UsersListMetaDto;
}
