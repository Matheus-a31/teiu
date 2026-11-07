import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { generateGithubWorkflow } from '../../src/generators/ci/github.js';
import { detectProject } from '../../src/detectors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

type RegistryType = 'ghcr' | 'dockerhub' | 'ecr' | undefined;

function buildWorkflow(fixture: string, registry?: RegistryType) {
  const project = detectProject(path.join(fixturesDir, fixture));
  return generateGithubWorkflow(project, registry ? { registry } : undefined);
}

describe('Generator: CI Workflow (GitHub Actions)', () => {
  const cases: [string, string, RegistryType, string[]][] = [
    ['Spring Maven with GHCR', 'spring-maven', 'ghcr', ['actions/setup-java@v4', "cache: 'maven'", './mvnw clean verify', 'ghcr.io']],
    ['Spring Gradle with Docker Hub', 'spring-gradle', 'dockerhub', ["cache: 'gradle'", './gradlew check', 'Log in to Docker Hub']],
    ['Nest npm with GHCR', 'nest-npm', 'ghcr', ['actions/setup-node@v4', "cache: 'npm'", 'run: npm ci', 'ghcr.io']],
    ['Nest pnpm with ECR', 'nest-pnpm', 'ecr', ['pnpm/action-setup@v4', "cache: 'pnpm'", 'Log in to Amazon ECR']],
    ['Nest yarn', 'nest-yarn', undefined, ["cache: 'yarn'", 'yarn install --frozen-lockfile']],
  ];

  it.each(cases)('should generate GitHub Actions workflow for %s', (name, fixture, registry, snippets) => {
    const generated = buildWorkflow(fixture, registry);
    expect(generated.targetPath).toBe('.github/workflows/ci.yml');
    for (const text of snippets) {
      expect(generated.content).toContain(text);
    }
    expect(generated.content).toMatchSnapshot();
  });
});
