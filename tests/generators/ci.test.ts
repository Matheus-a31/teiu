import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { generateGithubWorkflow } from '../../src/generators/ci/github.js';
import { detectProject } from '../../src/detectors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

function generateForFixture(fixtureName: string, registry?: 'ghcr' | 'dockerhub' | 'ecr') {
  const project = detectProject(path.join(fixturesDir, fixtureName));
  return generateGithubWorkflow(project, registry ? { registry } : undefined);
}

describe('Generator: CI Workflow (GitHub Actions)', () => {
  it.each([
    {
      name: 'Spring Maven with GHCR',
      fixture: 'spring-maven',
      registry: 'ghcr' as const,
      assertions: [
        'name: CI / CD',
        'actions/setup-java@v4',
        "distribution: 'temurin'",
        "java-version: '21'",
        "cache: 'maven'",
        './mvnw clean verify',
        'ghcr.io',
        'docker/build-push-action@v6',
        'cache-from: type=gha',
      ],
    },
    {
      name: 'Spring Gradle with Docker Hub',
      fixture: 'spring-gradle',
      registry: 'dockerhub' as const,
      assertions: [
        "cache: 'gradle'",
        './gradlew check',
        'Log in to Docker Hub',
        'DOCKER_HUB_USERNAME',
        'DOCKER_HUB_TOKEN',
      ],
    },
    {
      name: 'Nest npm with GHCR',
      fixture: 'nest-npm',
      registry: 'ghcr' as const,
      assertions: [
        'actions/setup-node@v4',
        "cache: 'npm'",
        'run: npm ci',
        'npm run lint --if-present',
        'npm test --if-present',
        'ghcr.io',
      ],
    },
    {
      name: 'Nest pnpm with ECR',
      fixture: 'nest-pnpm',
      registry: 'ecr' as const,
      assertions: [
        'pnpm/action-setup@v4',
        "cache: 'pnpm'",
        'pnpm install --frozen-lockfile',
        'Log in to Amazon ECR',
        'amazon-ecr-login@v2',
      ],
    },
    {
      name: 'Nest yarn',
      fixture: 'nest-yarn',
      registry: undefined,
      assertions: [
        "cache: 'yarn'",
        'yarn install --frozen-lockfile',
      ],
    },
  ])('should generate GitHub Actions workflow for $name', ({ fixture, registry, assertions }) => {
    const generated = generateForFixture(fixture, registry);
    expect(generated.targetPath).toBe('.github/workflows/ci.yml');
    for (const text of assertions) {
      expect(generated.content).toContain(text);
    }
    expect(generated.content).toMatchSnapshot();
  });
});
