// Copyright (C) 2016 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-%typedarray%.prototype.set-array-offset
description: >
  Return abrupt from ToNumber(src property symbol value)
info: >
  22.2.3.23.1 %TypedArray%.prototype.set (array [ , offset ] )

  1. Assert: array is any ECMAScript language value other than an Object with a
  [[TypedArrayName]] internal slot. If it is such an Object, the definition in
  22.2.3.23.2 applies.
  ...
  21. Repeat, while targetByteIndex < limit
    a. Let Pk be ! ToString(k).
    b. Let kNumber be ? ToNumber(? Get(src, Pk)).
    c. If IsDetachedBuffer(targetBuffer) is true, throw a TypeError exception.
    d. Perform SetValueInBuffer(targetBuffer, targetByteIndex, targetType,
    kNumber).
  ...
includes: [testTypedArray.js, compareArray.js]
features: [Symbol]
---*/

var obj = {
  length: 4,
  "0": 42,
  "1": 43,
  "2": Symbol("1"),
  "3": 44
};

testWithTypedArrayConstructors(function(TA) {
  var sample = new TA([1, 2, 3, 4]);

  assert.throws(TypeError, function() {
    sample.set(obj);
  });

  assert(
    compareArray(sample, [42, 43, 3, 4]),
    "values are set until exception"
  );
});

reportCompare(0, 0);