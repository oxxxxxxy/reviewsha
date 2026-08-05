import { describe, expect, it } from 'vitest';
import { ProjectsController } from '../../../../src/modules/projects/controllers/projects.controller';
import { ProjectsModule } from '../../../../src/modules/projects/projects.module';
import { ProjectsService } from '../../../../src/modules/projects/services/projects.service';
import { PROJECT_EVENTS } from '../../../../src/modules/projects/events/project.events';

describe('ProjectsModule', () => {
  it('registers the module composition', () => {
    expect(ProjectsModule).toBeDefined();
    expect(ProjectsController).toBeDefined();
    expect(ProjectsService).toBeDefined();
    expect(PROJECT_EVENTS).toMatchObject({
      created: 'project.created',
      updated: 'project.updated',
      archived: 'project.archived',
      deleted: 'project.deleted',
    });
  });
});
