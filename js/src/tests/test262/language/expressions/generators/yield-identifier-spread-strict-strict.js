// |reftest| error:SyntaxError
'use strict';
// This file was procedurally generated from the following sources:
// - src/generators/yield-identifier-spread-strict.case
// - src/generators/default/expression.template
/*---
description: It's an early error if the AssignmentExpression is a function body with yield as an identifier in strict mode. (Generator expression)
esid: prod-GeneratorExpression
features: [object-spread]
flags: [generated, onlyStrict]
negative:
  phase: early
  type: SyntaxError
info: |
    14.4 Generator Function Definitions

    GeneratorExpression:
      function * BindingIdentifier[+Yield, ~Await]opt ( FormalParameters[+Yield, ~Await] ) { GeneratorBody }

    Spread Properties

    PropertyDefinition[Yield]:
      (...)
      ...AssignmentExpression[In, ?Yield]

---*/

var callCount = 0;

var gen = function *() {
  callCount += 1;
  return {
       ...(function() {
          var yield;
          throw new Test262Error();
       }()),
    }
};

var iter = gen();



assert.sameValue(callCount, 1);
