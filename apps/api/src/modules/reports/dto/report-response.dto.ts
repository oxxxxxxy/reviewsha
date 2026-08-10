import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class ReportIssueDto {
  @ApiProperty() id!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() category!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() filePath!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) line!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) recommendation!: string | null;
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
  @ApiPropertyOptional({ type: Number, nullable: true }) score!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) summary!: string | null;
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty() tokensUsed!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: [ReportIssueDto] }) issues!: ReportIssueDto[];
  @ApiProperty({ type: [String] }) recommendations!: string[];
  @ApiProperty({ type: [ReportExportDto] }) exports!: ReportExportDto[];
}

export class ReportsListMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class ReportsListDto {
  @ApiProperty({ type: [ReportResponseDto] }) data!: ReportResponseDto[];
  @ApiProperty({ type: ReportsListMetaDto }) meta!: ReportsListMetaDto;
}
