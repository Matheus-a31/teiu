import type { ProjectInfo } from '../../types/project.js';
import { renderTemplateFile } from '../../core/template-engine.js';
import type { GeneratedDockerOutput } from './spring.js';

export interface GenerateNestDockerOptions {
  baseImage?: string;
}

export function generateNestDocker(
  projectInfo: ProjectInfo,
  options: GenerateNestDockerOptions = {},
): GeneratedDockerOutput {
  if (projectInfo.stack !== 'nest' || !projectInfo.nest) {
    throw new Error('O projeto informado não é do tipo NestJS.');
  }

  const rawNode = projectInfo.nest.nodeVersion || '20';
  const nodeMajor = rawNode.match(/\d+/)?.[0] || '20';
  const defaultImage = `node:${nodeMajor}-alpine`;
  const builderImage = options.baseImage || defaultImage;
  const runtimeImage = options.baseImage || defaultImage;

  const context: Record<string, unknown> = {
    nodeVersion: nodeMajor,
    builderImage,
    runtimeImage,
    packageManager: projectInfo.nest.packageManager,
    buildDir: projectInfo.nest.buildDir || 'dist',
    entryFile: projectInfo.nest.entryFile || 'dist/main.js',
    port: projectInfo.port || 3000,
    healthPath: projectInfo.healthPath || '/health',
  };

  const dockerfile = renderTemplateFile('docker/nest.Dockerfile.hbs', context);
  const dockerignore = renderTemplateFile('dotfiles/dockerignore.hbs', context);

  return {
    dockerfile,
    dockerignore,
  };
}
