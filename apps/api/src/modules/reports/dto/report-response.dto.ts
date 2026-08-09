import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class ReportIssueDto {
  @ApiProperty() id!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() category!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() filePath!: string;
  @ApiPropertyOptional({ nullable: true }) line!: number | null;
  @ApiPropertyOptional({ nullable: true }) recommendation!: string | null;
}

export class ReportExportDto {
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty() size!: number;
  @ApiProperty() createdAt!: Date;
}

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
  @ApiProperty({ type: [ReportIssueDto] }) issues!: ReportIssueDto[];
  @ApiProperty({ type: [String] }) recommendations!: string[];
  @ApiProperty({ type: [ReportExportDto] }) exports!: ReportExportDto[];
}

export class ReportsListDto {
  @ApiProperty({ type: [ReportResponseDto] }) data!: ReportResponseDto[];
  @ApiProperty() meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
