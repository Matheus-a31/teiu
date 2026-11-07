import { describe, it, expect } from 'vitest';
import { renderTemplate, renderTemplateFile } from '../../src/core/template-engine.js';

describe('Core: Template Engine', () => {
  it('should render simple variables', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'Teiú' });
    expect(result).toBe('Hello Teiú!');
  });

  it('should support eq helper', () => {
    const tmpl = '{{#if (eq tool "maven")}}Using Maven{{else}}Other{{/if}}';
    expect(renderTemplate(tmpl, { tool: 'maven' })).toBe('Using Maven');
    expect(renderTemplate(tmpl, { tool: 'gradle' })).toBe('Other');
  });

  it('should support ne helper', () => {
    const tmpl = '{{#if (ne tool "maven")}}Not Maven{{else}}Is Maven{{/if}}';
    expect(renderTemplate(tmpl, { tool: 'gradle' })).toBe('Not Maven');
    expect(renderTemplate(tmpl, { tool: 'maven' })).toBe('Is Maven');
  });

  it('should support json helper', () => {
    const tmpl = '{{{json data}}}';
    const result = renderTemplate(tmpl, { data: { stack: 'spring' } });
    expect(JSON.parse(result)).toEqual({ stack: 'spring' });
  });

  it('should support gh helper for GitHub Actions expressions', () => {
    const tmpl = 'user: {{gh "github.actor"}} | event: {{gh "github.event_name != \'pull_request\'"}}';
    expect(renderTemplate(tmpl, {})).toBe(
      "user: ${{ github.actor }} | event: ${{ github.event_name != 'pull_request' }}",
    );
  });

  it('should render template files from disk', () => {
    const rendered = renderTemplateFile('dotfiles/dockerignore.hbs', {});
    expect(rendered).toContain('target/');
    expect(rendered).toContain('.git');
  });
});
