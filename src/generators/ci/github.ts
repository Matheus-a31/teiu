import type { ProjectInfo } from '../../types/project.js';
import { renderTemplateFile } from '../../core/template-engine.js';

export interface CiOptions {
  registry?: 'ghcr' | 'dockerhub' | 'ecr';
}

export interface GeneratedCi {
  content: string;
  targetPath: string;
}

export function generateGithubWorkflow(
  project: ProjectInfo,
  options: CiOptions = {},
): GeneratedCi {
  const registry = options.registry || 'ghcr';
  const isGhcr = registry === 'ghcr';
  const isDockerHub = registry === 'dockerhub';
  const isEcr = registry === 'ecr';

  let templatePath: string;
  let context: Record<string, unknown>;

  if (project.stack === 'spring') {
    const buildTool = project.spring?.buildTool || 'maven';
    const isMaven = buildTool === 'maven';
    const isGradle = buildTool === 'gradle';
    const javaVersion = project.spring?.javaVersion || '21';
    const hasWrapper = project.spring?.hasWrapper ?? true;

    templatePath = 'ci/github-spring.yml.hbs';
    context = {
      javaVersion,
      buildTool,
      isMaven,
      isGradle,
      cacheType: isMaven ? 'maven' : 'gradle',
      hasWrapper,
      hasTests: project.hasTests,
      registry,
      isGhcr,
      isDockerHub,
      isEcr,
    };
  } else if (project.stack === 'nest') {
    const packageManager = project.nest?.packageManager || 'npm';
    const isNpm = packageManager === 'npm';
    const isPnpm = packageManager === 'pnpm';
    const isYarn = packageManager === 'yarn';
    const nodeVersion = project.nest?.nodeVersion || '20';

    templatePath = 'ci/github-nest.yml.hbs';
    context = {
      nodeVersion,
      packageManager,
      isNpm,
      isPnpm,
      isYarn,
      hasTests: project.hasTests,
      registry,
      isGhcr,
      isDockerHub,
      isEcr,
    };
  } else {
    throw new Error(`Stack não suportada para CI GitHub: ${project.stack}`);
  }

  const content = renderTemplateFile(templatePath, context);

  return {
    content,
    targetPath: '.github/workflows/ci.yml',
  };
}
