export type Stack = 'spring' | 'nest';

export interface SpringDetails {
  bootVersion: string;
  javaVersion: string;
  buildTool: 'maven' | 'gradle';
  hasWrapper: boolean;
  artifactPath: string;
  isKotlin?: boolean;
}

export interface NestDetails {
  nodeVersion: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  buildDir: string;
  entryFile: string;
}

export interface ExistingInfra {
  dockerfile: boolean;
  compose: boolean;
  ci: boolean;
  ciProvider?: 'github' | 'gitlab';
}

export interface ProjectInfo {
  stack: Stack;
  rootDir: string;

  // Informações comuns
  port: number;
  healthPath: string;
  hasTests: boolean;
  testFrameworks?: string[];

  // Detalhes específicos de cada stack
  spring?: SpringDetails;
  nest?: NestDetails;

  // Infraestrutura existente
  existing: ExistingInfra;
}
