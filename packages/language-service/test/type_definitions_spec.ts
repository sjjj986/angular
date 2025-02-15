/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {initMockFileSystem} from '@angular/compiler-cli/src/ngtsc/file_system/testing';

import {assertFileNames, assertTextSpans, humanizeDocumentSpanLike, LanguageServiceTestEnv, Project} from '../testing';

describe('type definitions', () => {
  let env: LanguageServiceTestEnv;

  it('returns the pipe class as definition when checkTypeOfPipes is false', () => {
    initMockFileSystem('Native');
    const files = {
      'app.ts': `
        import {Component, NgModule} from '@angular/core';
        import {CommonModule} from '@angular/common';

        @Component({templateUrl: 'app.html'})
        export class AppCmp {}

        @NgModule({declarations: [AppCmp], imports: [CommonModule]})
        export class AppModule {}
      `,
      'app.html': `Will be overridden`,
    };
    // checkTypeOfPipes is set to false when strict templates is false
    env = LanguageServiceTestEnv.setup();
    const project = env.addProject('test', files, {strictTemplates: false});
    const definitions =
        getTypeDefinitionsAndAssertBoundSpan(project, {templateOverride: '{{"1/1/2020" | dat¦e}}'});
    expect(definitions!.length).toEqual(3);

    assertTextSpans(definitions, ['transform']);
    assertFileNames(definitions, ['index.d.ts']);
  });

  describe('inputs', () => {
    it('return the definition for a signal input', () => {
      initMockFileSystem('Native');
      const files = {
        'app.ts': `
          import {Component, Directive, input} from '@angular/core';

          @Directive({
            selector: 'my-dir',
            standalone: true
          })
          export class MyDir {
            firstName = input<string>();
          }

          @Component({
            templateUrl: 'app.html',
            standalone: true,
            imports: [MyDir],
          })
          export class AppCmp {}
        `,
        'app.html': `Will be overridden`,
      };
      env = LanguageServiceTestEnv.setup();
      const project = env.addProject('test', files);
      const definitions = getTypeDefinitionsAndAssertBoundSpan(
          project, {templateOverride: `<my-dir [first¦Name]="undefined" />`});
      expect(definitions!.length).toEqual(1);

      assertTextSpans(definitions, ['InputSignal']);
      assertFileNames(definitions, ['index.d.ts']);
    });
  });

  describe('initializer-based output() API', () => {
    it('return the definition for an output', () => {
      initMockFileSystem('Native');
      const files = {
        'app.ts': `
          import {Component, Directive, output} from '@angular/core';

          @Directive({
            selector: 'my-dir',
            standalone: true
          })
          export class MyDir {
            nameChanges = output<string>();
          }

          @Component({
            templateUrl: 'app.html',
            standalone: true,
            imports: [MyDir],
          })
          export class AppCmp {
            doSmth() {}
          }
        `,
        'app.html': `Will be overridden`,
      };
      env = LanguageServiceTestEnv.setup();
      const project = env.addProject('test', files);
      const definitions = getTypeDefinitionsAndAssertBoundSpan(
          project, {templateOverride: `<my-dir (name¦Changes)="doSmth()" />`});
      expect(definitions!.length).toEqual(1);

      assertTextSpans(definitions, ['EventEmitter']);
      assertFileNames(definitions, ['index.d.ts']);
    });
  });

  function getTypeDefinitionsAndAssertBoundSpan(
      project: Project, {templateOverride}: {templateOverride: string}) {
    const text = templateOverride.replace('¦', '');
    const template = project.openFile('app.html');
    template.contents = text;
    env.expectNoSourceDiagnostics();
    project.expectNoTemplateDiagnostics('app.ts', 'AppCmp');

    template.moveCursorToText(templateOverride);
    const defs = template.getTypeDefinitionAtPosition();
    expect(defs).toBeTruthy();
    return defs!.map(d => humanizeDocumentSpanLike(d, env));
  }
});
