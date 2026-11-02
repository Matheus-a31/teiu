import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registra helpers do Handlebars
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
Handlebars.registerHelper('json', (val) => JSON.stringify(val, null, 2));

export function renderTemplate(templateSource: string, context: Record<string, unknown>): string {
  const compiled = Handlebars.compile(templateSource, { noEscape: true });
  return compiled(context);
}

export function findTemplatePath(relativeTemplatePath: string): string {
  const candidateBases = [
    // Em produção (dist/core -> dist/templates)
    path.resolve(__dirname, '..', 'templates'),
    // Em execução direta via dist (dist/templates)
    path.resolve(__dirname, 'templates'),
    // Em desenvolvimento (src/templates)
    path.resolve(__dirname, '..', '..', 'src', 'templates'),
    // A partir da raiz do pacote
    path.resolve(process.cwd(), 'src', 'templates'),
    path.resolve(process.cwd(), 'dist', 'templates'),
  ];

  for (const base of candidateBases) {
    const fullPath = path.join(base, relativeTemplatePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  throw new Error(`Template não encontrado: ${relativeTemplatePath}`);
}

export function renderTemplateFile(
  relativeTemplatePath: string,
  context: Record<string, unknown>,
): string {
  const fullPath = findTemplatePath(relativeTemplatePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return renderTemplate(content, context);
}
