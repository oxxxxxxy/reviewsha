import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class SuggestedPatchDto {
  @ApiProperty({ type: String }) before!: string;
  @ApiProperty({ type: String }) after!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) startLine?: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) endLine?: number;
}

export class CodeContextLineDto {
  @ApiProperty({ type: Number }) line!: number;
  @ApiProperty({ type: String }) content!: string;
  @ApiProperty({ type: Boolean }) isTarget!: boolean;
}

export class CodeContextDto {
  @ApiProperty({ type: Number }) startLine!: number;
  @ApiProperty({ type: Number }) endLine!: number;
  @ApiProperty({ type: [CodeContextLineDto] }) lines!: CodeContextLineDto[];
}

export class ReportIssueDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) severity!: string;
  @ApiProperty({ type: String }) category!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String }) filePath!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) line!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) lineStart!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) lineEnd!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) recommendation!: string | null;
  @ApiPropertyOptional({ type: SuggestedPatchDto, nullable: true })
  suggestedPatch?: { before: string; after: string; startLine?: number; endLine?: number } | null;
  @ApiPropertyOptional({ type: CodeContextDto, nullable: true })
  codeContext?: {
    startLine: number;
    endLine: number;
    lines: Array<{ line: number; content: string; isTarget: boolean }>;
  } | null;
}

export class ReportExportDto {
  @ApiProperty({ enum: ReportFormat }) format!: ReportFormat;
  @ApiProperty({ type: Number }) size!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class ReportFileDto {
  @ApiProperty({ type: String }) path!: string;
  @ApiProperty({ type: Number }) issueCount!: number;
  @ApiProperty({ type: String }) status!: 'REVIEWED' | 'ISSUES_FOUND';
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: [String] }) strengths!: string[];
  @ApiProperty({ type: [String] }) weaknesses!: string[];
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
  @ApiProperty({ type: [ReportFileDto] }) files!: ReportFileDto[];
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
