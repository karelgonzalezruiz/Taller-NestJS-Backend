import ts from 'typescript';
import type { Plugin } from 'vite';

// NestJS y TypeORM necesitan los metadatos de los decoradores también en Vitest.
export function metadataPlugin(): Plugin {
  return {
    name: 'typescript-decorator-metadata',
    enforce: 'pre',
    transform(code, id) {
      const filename = id.split('?')[0];
      if (!/[\\/]src[\\/].*\.ts$/.test(filename)) return;
      const result = ts.transpileModule(code, {
        fileName: filename,
        compilerOptions: {
          target: ts.ScriptTarget.ES2023,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          sourceMap: true,
          inlineSources: true,
        },
      });
      return { code: result.outputText, map: result.sourceMapText };
    },
  };
}
