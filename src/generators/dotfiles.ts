import type { ProjectInfo } from '../types/project.js';
import { renderTemplateFile } from '../core/template-engine.js';
import type { DatabaseType, CacheType } from './compose/services.js';

export interface DotfilesOptions {
  db?: DatabaseType;
  cache?: CacheType;
}

export function generateEnvExample(
  projectInfo: ProjectInfo,
  options: DotfilesOptions = {},
): string {
  const context: Record<string, unknown> = {
    stack: projectInfo.stack,
    port: projectInfo.port || (projectInfo.stack === 'spring' ? 8080 : 3000),
    db: options.db || 'none',
    cache: options.cache || 'none',
  };

  return renderTemplateFile('dotfiles/env.example.hbs', context);
}
