import type { ProjectInfo } from '../../types/project.js';
import { renderTemplateFile } from '../../core/template-engine.js';

export interface GenerateSpringDockerOptions {
  baseImage?: string;
}

export interface GeneratedDockerOutput {
  dockerfile: string;
  dockerignore: string;
}

export function generateSpringDocker(
  projectInfo: ProjectInfo,
  options: GenerateSpringDockerOptions = {},
): GeneratedDockerOutput {
  if (projectInfo.stack !== 'spring' || !projectInfo.spring) {
    throw new Error('O projeto informado não é do tipo Spring Boot.');
  }

  const javaVersion = projectInfo.spring.javaVersion || '21';
  const builderImage = `eclipse-temurin:${javaVersion}-jdk-alpine`;
  const runtimeImage = options.baseImage || `eclipse-temurin:${javaVersion}-jre-alpine`;

  const context: Record<string, unknown> = {
    javaVersion,
    builderImage,
    runtimeImage,
    buildTool: projectInfo.spring.buildTool,
    hasWrapper: projectInfo.spring.hasWrapper,
    isKotlin: Boolean(projectInfo.spring.isKotlin),
    artifactPath: projectInfo.spring.artifactPath,
    port: projectInfo.port || 8080,
    healthPath: projectInfo.healthPath || '/actuator/health',
  };

  const dockerfile = renderTemplateFile('docker/spring.Dockerfile.hbs', context);
  const dockerignore = renderTemplateFile('dotfiles/dockerignore.hbs', context);

  return {
    dockerfile,
    dockerignore,
  };
}
