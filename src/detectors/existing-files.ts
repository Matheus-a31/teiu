import fs from 'node:fs';
import path from 'node:path';
import type { ExistingInfra } from '../types/project.js';

export function detectExistingFiles(rootDir: string): ExistingInfra {
  const dockerfile =
    fs.existsSync(path.join(rootDir, 'Dockerfile')) ||
    fs.existsSync(path.join(rootDir, 'docker', 'Dockerfile'));

  const compose =
    fs.existsSync(path.join(rootDir, 'docker-compose.yml')) ||
    fs.existsSync(path.join(rootDir, 'docker-compose.yaml')) ||
    fs.existsSync(path.join(rootDir, 'compose.yml')) ||
    fs.existsSync(path.join(rootDir, 'compose.yaml'));

  const githubWorkflowsDir = path.join(rootDir, '.github', 'workflows');
  let hasGithubCI = false;
  if (fs.existsSync(githubWorkflowsDir) && fs.statSync(githubWorkflowsDir).isDirectory()) {
    const files = fs.readdirSync(githubWorkflowsDir);
    hasGithubCI = files.some((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  }

  const hasGitlabCI = fs.existsSync(path.join(rootDir, '.gitlab-ci.yml'));

  const ci = hasGithubCI || hasGitlabCI;
  const ciProvider = hasGithubCI ? 'github' : hasGitlabCI ? 'gitlab' : undefined;

  return {
    dockerfile,
    compose,
    ci,
    ciProvider,
  };
}
