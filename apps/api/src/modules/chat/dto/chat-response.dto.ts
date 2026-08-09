import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '@prisma/client';

export class ChatSessionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() messagesCount!: number;
}

export class ChatMessageResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: MessageRole }) role!: MessageRole;
  @ApiProperty() content!: string;
  @ApiProperty() tokens!: number;
  @ApiProperty() createdAt!: Date;
}

export class ChatSessionListResponseDto {
  @ApiProperty({ type: [ChatSessionResponseDto] }) data!: ChatSessionResponseDto[];
  @ApiProperty() meta!: { page: number; limit: number; total: number };
}

export class ChatMessageListResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto] }) data!: ChatMessageResponseDto[];
  @ApiProperty() meta!: { page: number; limit: number; total: number };
}
