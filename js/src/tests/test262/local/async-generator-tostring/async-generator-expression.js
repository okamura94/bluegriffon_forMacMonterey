// Copyright 2017 André Bargull. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: pending
description: Function.prototype.toString on an async generator expression
features: [async-iteration]
---*/

let f = /* before */async /* a */ function /* b */ * /* c */ f /* d */ ( /* e */ x /* f */ , /* g */ y /* h */ ) /* i */ { /* j */ ; /* k */ ; /* l */ }/* after */;

assert.sameValue(f.toString(), "async /* a */ function /* b */ * /* c */ f /* d */ ( /* e */ x /* f */ , /* g */ y /* h */ ) /* i */ { /* j */ ; /* k */ ; /* l */ }");

reportCompare(0, 0);
