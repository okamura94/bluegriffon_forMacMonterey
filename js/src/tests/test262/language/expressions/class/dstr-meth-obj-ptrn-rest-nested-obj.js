// This file was procedurally generated from the following sources:
// - src/dstr-binding/obj-ptrn-rest-nested-obj.case
// - src/dstr-binding/default/cls-expr-meth.template
/*---
description: When DestructuringAssignmentTarget is an object literal, it should be parsed parsed as a DestructuringAssignmentPattern and evaluated as a destructuring assignment. (class expression method)
esid: sec-class-definitions-runtime-semantics-evaluation
es6id: 14.5.16
features: [destructuring-binding]
flags: [generated]
info: |
    ClassExpression : class BindingIdentifieropt ClassTail

    1. If BindingIdentifieropt is not present, let className be undefined.
    2. Else, let className be StringValue of BindingIdentifier.
    3. Let value be the result of ClassDefinitionEvaluation of ClassTail
       with argument className.
    [...]

    14.5.14 Runtime Semantics: ClassDefinitionEvaluation

    21. For each ClassElement m in order from methods
        a. If IsStatic of m is false, then
           i. Let status be the result of performing
              PropertyDefinitionEvaluation for m with arguments proto and
              false.
        [...]

    14.3.8 Runtime Semantics: DefineMethod

    MethodDefinition : PropertyName ( StrictFormalParameters ) { FunctionBody }

    [...]
    6. Let closure be FunctionCreate(kind, StrictFormalParameters, FunctionBody,
       scope, strict). If functionPrototype was passed as a parameter then pass its
       value as the functionPrototype optional argument of FunctionCreate.
    [...]

    9.2.1 [[Call]] ( thisArgument, argumentsList)

    [...]
    7. Let result be OrdinaryCallEvaluateBody(F, argumentsList).
    [...]

    9.2.1.3 OrdinaryCallEvaluateBody ( F, argumentsList )

    1. Let status be FunctionDeclarationInstantiation(F, argumentsList).
    [...]

    9.2.12 FunctionDeclarationInstantiation(func, argumentsList)

    [...]
    23. Let iteratorRecord be Record {[[iterator]]:
        CreateListIterator(argumentsList), [[done]]: false}.
    24. If hasDuplicates is true, then
        [...]
    25. Else,
        b. Let formalStatus be IteratorBindingInitialization for formals with
           iteratorRecord and env as arguments.
    [...]
---*/
var obj = {a: 3, b: 4};

var callCount = 0;
var C = class {
  method({a, b, ...{c, e}}) {
    assert.sameValue(a, 1);
    assert.sameValue(b, 2);
    assert.sameValue(c, 3);
    assert.sameValue(e, 5);

    callCount = callCount + 1;
  }
};

new C().method({a: 1, b: 2, c: 3, d: 4, e: 5});
assert.sameValue(callCount, 1, 'method invoked exactly once');

reportCompare(0, 0);
