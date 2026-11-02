import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { SpringDetails } from '../types/project.js';

export interface SpringDetectionResult {
  isSpring: boolean;
  details?: SpringDetails;
  hasTests: boolean;
  testFrameworks: string[];
}

function hasKotlinFiles(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (hasKotlinFiles(fullPath)) return true;
      } else if (entry.name.endsWith('.kt')) {
        return true;
      }
    }
  } catch {
    // Silently ignore directory read errors
  }
  return false;
}

export function detectSpring(rootDir: string): SpringDetectionResult {
  const pomPath = path.join(rootDir, 'pom.xml');
  const gradlePath = path.join(rootDir, 'build.gradle');
  const gradleKtsPath = path.join(rootDir, 'build.gradle.kts');

  // 1. Detecção via Maven (pom.xml)
  if (fs.existsSync(pomPath)) {
    try {
      const pomContent = fs.readFileSync(pomPath, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
      const parsed = parser.parse(pomContent);

      const project = parsed?.project;
      if (project) {
        let isSpring = false;
        let bootVersion = '3.2.0';

        // Checa <parent>
        const parent = project.parent;
        if (
          parent &&
          (parent.groupId === 'org.springframework.boot' ||
            parent.artifactId === 'spring-boot-starter-parent')
        ) {
          isSpring = true;
          if (parent.version) {
            bootVersion = String(parent.version).trim();
          }
        }

        // Checa <dependencies> se não encontrou no parent
        const rawDeps = project.dependencies?.dependency;
        const deps = Array.isArray(rawDeps) ? rawDeps : rawDeps ? [rawDeps] : [];
        for (const dep of deps) {
          if (dep.groupId === 'org.springframework.boot') {
            isSpring = true;
            if (dep.version && bootVersion === '3.2.0') {
              bootVersion = String(dep.version).trim();
            }
          }
        }

        // Checa ocorrência textual direta se o XML tiver estrutura diferenciada
        if (!isSpring && pomContent.includes('org.springframework.boot')) {
          isSpring = true;
        }

        if (isSpring) {
          // Versão do Java
          const properties = project.properties ?? {};
          let javaVersion = '21';
          if (properties['java.version']) {
            javaVersion = String(properties['java.version']).trim();
          } else if (properties['maven.compiler.source']) {
            javaVersion = String(properties['maven.compiler.source']).trim();
          } else if (properties['maven.compiler.release']) {
            javaVersion = String(properties['maven.compiler.release']).trim();
          }

          // Normaliza versão (ex: 1.8 -> 8)
          if (javaVersion.startsWith('1.')) {
            javaVersion = javaVersion.substring(2);
          }

          // Checa wrapper mvnw
          const hasWrapper =
            fs.existsSync(path.join(rootDir, 'mvnw')) ||
            fs.existsSync(path.join(rootDir, 'mvnw.cmd'));

          // Checa Kotlin
          const isKotlin =
            pomContent.includes('org.jetbrains.kotlin') ||
            hasKotlinFiles(path.join(rootDir, 'src', 'main'));

          // Detecção de testes
          const testDir = path.join(rootDir, 'src', 'test');
          const hasTests = fs.existsSync(testDir);
          const testFrameworks: string[] = [];

          if (pomContent.includes('junit') || pomContent.includes('spring-boot-starter-test')) {
            testFrameworks.push('JUnit 5');
          }
          if (pomContent.includes('testcontainers')) {
            testFrameworks.push('Testcontainers');
          }

          return {
            isSpring: true,
            details: {
              bootVersion,
              javaVersion,
              buildTool: 'maven',
              hasWrapper,
              artifactPath: 'target/*.jar',
              isKotlin,
            },
            hasTests,
            testFrameworks,
          };
        }
      }
    } catch {
      // Falha ao parsear pom.xml, continua para verificar gradle
    }
  }

  // 2. Detecção via Gradle (build.gradle ou build.gradle.kts)
  const isGradleKts = fs.existsSync(gradleKtsPath);
  const isGradle = fs.existsSync(gradlePath) || isGradleKts;

  if (isGradle) {
    const activeGradlePath = isGradleKts ? gradleKtsPath : gradlePath;
    try {
      const gradleContent = fs.readFileSync(activeGradlePath, 'utf-8');

      const isSpring =
        gradleContent.includes('org.springframework.boot') ||
        gradleContent.includes('spring-boot-starter');

      if (isSpring) {
        // Extrai versão do Spring Boot
        let bootVersion = '3.2.0';
        const bootVersionMatch =
          gradleContent.match(
            /id\s*\(?['"]org\.springframework\.boot['"]\)?\s*version\s*['"]([^'"]+)['"]/,
          ) || gradleContent.match(/springBootVersion\s*=\s*['"]([^'"]+)['"]/);
        if (bootVersionMatch && bootVersionMatch[1]) {
          bootVersion = bootVersionMatch[1].trim();
        }

        // Extrai versão do Java
        let javaVersion = '21';
        const javaMatch =
          gradleContent.match(/jvmToolchain\s*\(\s*(\d+)\s*\)/) ||
          gradleContent.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/) ||
          gradleContent.match(/JavaVersion\.VERSION_(\d+)/) ||
          gradleContent.match(/JavaLanguageVersion\.of\s*\(\s*(\d+)\s*\)/);
        if (javaMatch && javaMatch[1]) {
          javaVersion = javaMatch[1].trim();
        }

        // Checa wrapper gradlew
        const hasWrapper =
          fs.existsSync(path.join(rootDir, 'gradlew')) ||
          fs.existsSync(path.join(rootDir, 'gradlew.bat'));

        // Checa Kotlin
        const isKotlin =
          isGradleKts ||
          gradleContent.includes('org.jetbrains.kotlin') ||
          hasKotlinFiles(path.join(rootDir, 'src', 'main'));

        // Detecção de testes
        const testDir = path.join(rootDir, 'src', 'test');
        const hasTests = fs.existsSync(testDir);
        const testFrameworks: string[] = [];

        if (gradleContent.includes('junit') || gradleContent.includes('spring-boot-starter-test')) {
          testFrameworks.push('JUnit 5');
        }
        if (gradleContent.includes('testcontainers')) {
          testFrameworks.push('Testcontainers');
        }

        return {
          isSpring: true,
          details: {
            bootVersion,
            javaVersion,
            buildTool: 'gradle',
            hasWrapper,
            artifactPath: 'build/libs/*.jar',
            isKotlin,
          },
          hasTests,
          testFrameworks,
        };
      }
    } catch {
      // Ignora erro ao ler arquivo gradle
    }
  }

  return {
    isSpring: false,
    hasTests: false,
    testFrameworks: [],
  };
}
