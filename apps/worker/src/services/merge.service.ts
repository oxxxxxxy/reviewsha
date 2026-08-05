import { Injectable } from '@nestjs/common';
import type { ParsedProject } from './parser.service';

@Injectable()
export class MergeService {
  merge(input: {
    projectId: string;
    uploadId: string;
    download: unknown;
    extract: unknown;
    parse: ParsedProject;
  }) {
    return {
      project: { projectId: input.projectId, uploadId: input.uploadId },
      download: input.download,
      extract: input.extract,
      files: input.parse.files,
      languages: input.parse.languages,
      structure: input.parse.structure,
      statistics: input.parse.statistics,
    };
  }
}
