// This file was procedurally generated from the following sources:
// - src/dstr-binding/obj-ptrn-rest-obj-own-property.case
// - src/dstr-binding/default/for-of-var.template
/*---
description: Rest object contains just soruce object's own properties (for-of statement)
esid: sec-for-in-and-for-of-statements-runtime-semantics-labelledevaluation
es6id: 13.7.5.11
features: [destructuring-binding]
flags: [generated]
includes: [propertyHelper.js]
info: |
    IterationStatement :
        for ( var ForBinding of AssignmentExpression ) Statement

    [...]
    3. Return ForIn/OfBodyEvaluation(ForBinding, Statement, keyResult,
       varBinding, labelSet).

    13.7.5.13 Runtime Semantics: ForIn/OfBodyEvaluation

    [...]
    3. Let destructuring be IsDestructuring of lhs.
    [...]
    5. Repeat
       [...]
       h. If destructuring is false, then
          [...]
       i. Else
          i. If lhsKind is assignment, then
             [...]
          ii. Else if lhsKind is varBinding, then
              1. Assert: lhs is a ForBinding.
              2. Let status be the result of performing BindingInitialization
                 for lhs passing nextValue and undefined as the arguments.
          [...]
---*/
var o = Object.create({ x: 1, y: 2 });
o.z = 3;

var iterCount = 0;

for (var { x, ...{y , z} } of [o]) {
  assert.sameValue(x, 1);
  assert.sameValue(y, undefined);
  assert.sameValue(z, 3);


  iterCount += 1;
}

assert.sameValue(iterCount, 1, 'Iteration occurred as expected');

reportCompare(0, 0);
