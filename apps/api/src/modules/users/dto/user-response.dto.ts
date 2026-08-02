import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'developer@reviewsha.local' })
  email!: string;

  @ApiProperty({ example: 'Developer' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.reviewsha.local/avatars/user.png', nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-02T12:00:00.000Z' })
  updatedAt!: string;
}

export class UsersListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 135 })
  total!: number;

  @ApiProperty({ example: 7 })
  pages!: number;
}

export class UsersListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ type: UsersListMetaDto })
  meta!: UsersListMetaDto;
}
