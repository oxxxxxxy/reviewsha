import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class ReportResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() scanId!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty({ enum: ['GENERATING', 'READY', 'FAILED'] }) status!: string;
  @ApiPropertyOptional({ nullable: true }) score!: number | null;
  @ApiPropertyOptional({ nullable: true }) summary!: string | null;
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty() tokensUsed!: number;
  @ApiProperty() createdAt!: Date;
}

export class ReportsListDto {
  @ApiProperty({ type: [ReportResponseDto] }) data!: ReportResponseDto[];
}
