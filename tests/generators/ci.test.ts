import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { generateGithubWorkflow } from '../../src/generators/ci/github.js';
import { detectProject } from '../../src/detectors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Generator: CI Workflow (GitHub Actions)', () => {
  it('should generate GitHub Actions workflow for Spring Maven with GHCR', () => {
    const project = detectProject(path.join(fixturesDir, 'spring-maven'));
    const generated = generateGithubWorkflow(project, { registry: 'ghcr' });

    expect(generated.targetPath).toBe('.github/workflows/ci.yml');
    expect(generated.content).toContain('name: CI / CD');
    expect(generated.content).toContain('actions/setup-java@v4');
    expect(generated.content).toContain('distribution: \'temurin\'');
    expect(generated.content).toContain('java-version: \'21\'');
    expect(generated.content).toContain('cache: \'maven\'');
    expect(generated.content).toContain('./mvnw clean verify');
    expect(generated.content).toContain('ghcr.io');
    expect(generated.content).toContain('docker/build-push-action@v6');
    expect(generated.content).toContain('cache-from: type=gha');
    expect(generated.content).toMatchSnapshot();
  });

  it('should generate GitHub Actions workflow for Spring Gradle with Docker Hub', () => {
    const project = detectProject(path.join(fixturesDir, 'spring-gradle'));
    const generated = generateGithubWorkflow(project, { registry: 'dockerhub' });

    expect(generated.content).toContain('cache: \'gradle\'');
    expect(generated.content).toContain('./gradlew check');
    expect(generated.content).toContain('Log in to Docker Hub');
    expect(generated.content).toContain('DOCKER_HUB_USERNAME');
    expect(generated.content).toContain('DOCKER_HUB_TOKEN');
    expect(generated.content).toMatchSnapshot();
  });

  it('should generate GitHub Actions workflow for Nest npm with GHCR', () => {
    const project = detectProject(path.join(fixturesDir, 'nest-npm'));
    const generated = generateGithubWorkflow(project, { registry: 'ghcr' });

    expect(generated.targetPath).toBe('.github/workflows/ci.yml');
    expect(generated.content).toContain('actions/setup-node@v4');
    expect(generated.content).toContain('cache: \'npm\'');
    expect(generated.content).toContain('run: npm ci');
    expect(generated.content).toContain('npm run lint --if-present');
    expect(generated.content).toContain('npm test --if-present');
    expect(generated.content).toContain('ghcr.io');
    expect(generated.content).toMatchSnapshot();
  });

  it('should generate GitHub Actions workflow for Nest pnpm with ECR', () => {
    const project = detectProject(path.join(fixturesDir, 'nest-pnpm'));
    const generated = generateGithubWorkflow(project, { registry: 'ecr' });

    expect(generated.content).toContain('pnpm/action-setup@v4');
    expect(generated.content).toContain('cache: \'pnpm\'');
    expect(generated.content).toContain('pnpm install --frozen-lockfile');
    expect(generated.content).toContain('Log in to Amazon ECR');
    expect(generated.content).toContain('amazon-ecr-login@v2');
    expect(generated.content).toMatchSnapshot();
  });

  it('should generate GitHub Actions workflow for Nest yarn', () => {
    const project = detectProject(path.join(fixturesDir, 'nest-yarn'));
    const generated = generateGithubWorkflow(project);

    expect(generated.content).toContain('cache: \'yarn\'');
    expect(generated.content).toContain('yarn install --frozen-lockfile');
    expect(generated.content).toMatchSnapshot();
  });
});
