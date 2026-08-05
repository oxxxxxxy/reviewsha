import { Injectable } from '@nestjs/common';
import { readdir } from 'node:fs/promises';

@Injectable()
export class ProjectReaderService {
  readDirectory(directory: string): Promise<string[]> {
    return readdir(directory, { recursive: true });
  }
}
