// |reftest| skip-if(!this.hasOwnProperty('SharedArrayBuffer')) -- SharedArrayBuffer not yet riding the trains
// Copyright (C) 2016 the V8 project authors. All rights reserved.
// Copyright (C) 2017 Mozilla Corporation. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
es6id: 24.2.2.1
esid: sec-dataview-buffer-byteoffset-bytelength
description: >
  Return abrupt from ToLength(symbol byteLength)
info: |
  24.2.2.1 DataView (buffer, byteOffset, byteLength )

  ...
  10. If byteLength is undefined, then
    a. Let viewByteLength be bufferByteLength - offset.
  11. Else,
    a. Let viewByteLength be ? ToLength(byteLength).
  ...
features: [SharedArrayBuffer]
---*/

var buffer = new SharedArrayBuffer(8);
var length = Symbol("1");

assert.throws(TypeError, function() {
  new DataView(buffer, 0, length);
});

reportCompare(0, 0);
