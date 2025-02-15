/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import ts from 'typescript';

import {Decorator, ReflectionHost} from '../../..//ngtsc/reflection';
import {ImportManager} from '../../../ngtsc/translator';

/** Function that can be used to transform class properties. */
export type PropertyTransform =
    (node: ts.PropertyDeclaration&{name: ts.Identifier | ts.StringLiteralLike},
     host: ReflectionHost, factory: ts.NodeFactory, importManager: ImportManager,
     classDecorator: Decorator, isCore: boolean) => ts.PropertyDeclaration;

/**
 * Creates an import and access for a given Angular core import while
 * ensuring the decorator symbol access can be traced back to an Angular core
 * import in order to make the synthetic decorator compatible with the JIT
 * decorator downlevel transform.
 */
export function createSyntheticAngularCoreDecoratorAccess(
    factory: ts.NodeFactory, importManager: ImportManager, ngClassDecorator: Decorator,
    decoratorName: string): ts.PropertyAccessExpression {
  const classDecoratorIdentifier = ts.isIdentifier(ngClassDecorator.identifier) ?
      ngClassDecorator.identifier :
      ngClassDecorator.identifier.expression;

  return factory.createPropertyAccessExpression(
      importManager.generateNamespaceImport('@angular/core'),
      // The synthetic identifier may be checked later by the downlevel decorators
      // transform to resolve to an Angular import using `getSymbolAtLocation`. We trick
      // the transform to think it's not synthetic and comes from Angular core.
      ts.setOriginalNode(factory.createIdentifier(decoratorName), classDecoratorIdentifier));
}
