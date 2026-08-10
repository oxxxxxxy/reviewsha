import { ApiProperty } from '@nestjs/swagger';
import { MessageRole } from '@prisma/client';

export class ChatSessionResponseDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: Number }) messagesCount!: number;
}

export class ChatMessageResponseDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ enum: MessageRole }) role!: MessageRole;
  @ApiProperty({ type: String }) content!: string;
  @ApiProperty({ type: Number }) tokens!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class ChatSessionListResponseDto {
  @ApiProperty({ type: [ChatSessionResponseDto] }) data!: ChatSessionResponseDto[];
  @ApiProperty({ type: Object }) meta!: { page: number; limit: number; total: number };
}

export class ChatMessageListResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto] }) data!: ChatMessageResponseDto[];
  @ApiProperty({ type: Object }) meta!: { page: number; limit: number; total: number };
}
