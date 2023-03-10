// |reftest| error:SyntaxError
'use strict';
// This file was procedurally generated from the following sources:
// - src/generators/yield-identifier-spread-strict.case
// - src/generators/default/method-definition.template
/*---
description: It's an early error if the AssignmentExpression is a function body with yield as an identifier in strict mode. (Generator method)
esid: prod-GeneratorMethod
features: [object-spread]
flags: [generated, onlyStrict]
negative:
  phase: early
  type: SyntaxError
info: |
    14.4 Generator Function Definitions

    GeneratorMethod[Yield, Await]:
      * PropertyName[?Yield, ?Await] ( UniqueFormalParameters[+Yield, ~Await] ) { GeneratorBody }

    Spread Properties

    PropertyDefinition[Yield]:
      (...)
      ...AssignmentExpression[In, ?Yield]

---*/

var callCount = 0;

var gen = {
  *method() {
    callCount += 1;
    return {
         ...(function() {
            var yield;
            throw new Test262Error();
         }()),
      }
  }
}.method;

var iter = gen();



assert.sameValue(callCount, 1);
