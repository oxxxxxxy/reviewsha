import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class ReportIssueDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) severity!: string;
  @ApiProperty({ type: String }) category!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String }) filePath!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) line!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) recommendation!: string | null;
}

export class ReportExportDto {
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty({ type: Number }) size!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class ReportResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) scanId!: string;
  @ApiProperty({ type: String }) projectId!: string;
  @ApiProperty({ enum: ['GENERATING', 'READY', 'FAILED'] }) status!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) score!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) summary!: string | null;
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty({ type: Number }) tokensUsed!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: [ReportIssueDto] }) issues!: ReportIssueDto[];
  @ApiProperty({ type: [String] }) recommendations!: string[];
  @ApiProperty({ type: [ReportExportDto] }) exports!: ReportExportDto[];
}

export class ReportsListMetaDto {
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) totalPages!: number;
}

export class ReportsListDto {
  @ApiProperty({ type: [ReportResponseDto] }) data!: ReportResponseDto[];
  @ApiProperty({ type: ReportsListMetaDto }) meta!: ReportsListMetaDto;
}
