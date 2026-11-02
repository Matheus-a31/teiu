export interface TeiuConfig {
  provider?: 'github' | 'gitlab' | 'none';
  db?: 'postgres' | 'mysql' | 'none';
  cache?: 'redis' | 'none';
  registry?: 'ghcr' | 'dockerhub' | 'ecr';
  force: boolean;
  dryRun: boolean;
  yes: boolean;
}
