// This file was procedurally generated from the following sources:
// - src/dstr-assignment/obj-rest-empty-obj.case
// - src/dstr-assignment/default/assignment-expr.template
/*---
description: RestBindingInitialization creates a new object even if lhs is an empty object (AssignmentExpression)
esid: sec-variable-statement-runtime-semantics-evaluation
es6id: 13.3.2.4
features: [destructuring-binding]
flags: [generated]
info: |
    VariableDeclaration : BindingPattern Initializer

    1. Let rhs be the result of evaluating Initializer.
    2. Let rval be GetValue(rhs).
    3. ReturnIfAbrupt(rval).
    4. Return the result of performing BindingInitialization for
       BindingPattern passing rval and undefined as arguments.
---*/
var rest;


var result;
var vals = {};

result = {...rest} = vals;

assert.notSameValue(rest, undefined);
assert.notSameValue(rest, null);
assert.sameValue(typeof rest, "object");


assert.sameValue(result, vals);

reportCompare(0, 0);
