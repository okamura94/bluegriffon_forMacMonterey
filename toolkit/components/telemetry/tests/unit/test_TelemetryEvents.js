/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/
*/

const OPTIN = Ci.nsITelemetry.DATASET_RELEASE_CHANNEL_OPTIN;
const OPTOUT = Ci.nsITelemetry.DATASET_RELEASE_CHANNEL_OPTOUT;

function checkEventFormat(events) {
  Assert.ok(Array.isArray(events), "Events should be serialized to an array.");
  for (let e of events) {
    Assert.ok(Array.isArray(e), "Event should be an array.");
    Assert.greaterOrEqual(e.length, 4, "Event should have at least 4 elements.");
    Assert.lessOrEqual(e.length, 6, "Event should have at most 6 elements.");

    Assert.equal(typeof(e[0]), "number", "Element 0 should be a number.");
    Assert.equal(typeof(e[1]), "string", "Element 1 should be a string.");
    Assert.equal(typeof(e[2]), "string", "Element 2 should be a string.");
    Assert.equal(typeof(e[3]), "string", "Element 3 should be a string.");

    if (e.length > 4) {
      Assert.ok(e[4] === null || typeof(e[4]) == "string",
                "Event element 4 should be null or a string.");
    }
    if (e.length > 5) {
      Assert.ok(e[5] === null || typeof(e[5]) == "object",
                "Event element 5 should be null or an object.");
    }

    let extra = e[5];
    if (extra) {
      Assert.ok(Object.keys(extra).every(k => typeof(k) == "string"),
                "All extra keys should be strings.");
      Assert.ok(Object.values(extra).every(v => typeof(v) == "string"),
                "All extra values should be strings.");
    }
  }
}

add_task(function* test_recording_state() {
  const events = [
    ["telemetry.test", "test1", "object1"],
    ["telemetry.test.second", "test", "object1"],
  ];

  // Both test categories should be off by default.
  events.forEach(e => Telemetry.recordEvent(...e));
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not have recorded any events.");

  // Enable one test category and see that we record correctly.
  Telemetry.setEventRecordingEnabled("telemetry.test", true);
  events.forEach(e => Telemetry.recordEvent(...e));
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  Assert.equal(snapshot.default.length, 1, "Should have recorded one event.");
  Assert.equal(snapshot.default[0][1], "telemetry.test", "Should have recorded one event in telemetry.test");

  // Also enable the other test category and see that we record correctly.
  Telemetry.setEventRecordingEnabled("telemetry.test.second", true);
  events.forEach(e => Telemetry.recordEvent(...e));
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  Assert.equal(snapshot.default.length, 2, "Should have recorded two events.");
  Assert.equal(snapshot.default[0][1], "telemetry.test", "Should have recorded one event in telemetry.test");
  Assert.equal(snapshot.default[1][1], "telemetry.test.second", "Should have recorded one event in telemetry.test.second");

  // Now turn of one category again and check that this works as expected.
  Telemetry.setEventRecordingEnabled("telemetry.test", false);
  events.forEach(e => Telemetry.recordEvent(...e));
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  Assert.equal(snapshot.default.length, 1, "Should have recorded one event.");
  Assert.equal(snapshot.default[0][1], "telemetry.test.second", "Should have recorded one event in telemetry.test.second");
});

add_task(function* recording_setup() {
  // Make sure both test categories are enabled for the remaining tests.
  // Otherwise their event recording won't work.
  Telemetry.setEventRecordingEnabled("telemetry.test", true);
  Telemetry.setEventRecordingEnabled("telemetry.test.second", true);
});

add_task(function* test_recording() {
  Telemetry.clearEvents();

  // Record some events.
  let expected = [
    {optout: false, event: ["telemetry.test", "test1", "object1"]},
    {optout: false, event: ["telemetry.test", "test2", "object2"]},

    {optout: false, event: ["telemetry.test", "test1", "object1", "value"]},
    {optout: false, event: ["telemetry.test", "test1", "object1", "value", null]},
    {optout: false, event: ["telemetry.test", "test1", "object1", null, {"key1": "value1"}]},
    {optout: false, event: ["telemetry.test", "test1", "object1", "value", {"key1": "value1", "key2": "value2"}]},

    {optout: true,  event: ["telemetry.test", "optout", "object1"]},
    {optout: false, event: ["telemetry.test.second", "test", "object1"]},
    {optout: false, event: ["telemetry.test.second", "test", "object1", null, {"key1": "value1"}]},
  ];

  for (let entry of expected) {
    entry.tsBefore = Math.floor(Telemetry.msSinceProcessStart());
    try {
      Telemetry.recordEvent(...entry.event);
    } catch (ex) {
      Assert.ok(false, `Failed to record event ${JSON.stringify(entry.event)}: ${ex}`);
    }
    entry.tsAfter = Math.floor(Telemetry.msSinceProcessStart());
  }

  // Strip off trailing null values to match the serialized events.
  for (let entry of expected) {
    let e = entry.event;
    while ((e.length >= 3) && (e[e.length - 1] === null)) {
      e.pop();
    }
  }

  // The following should not result in any recorded events.
  Assert.throws(() => Telemetry.recordEvent("unknown.category", "test1", "object1"),
                /Error: Unknown event: \["unknown.category", "test1", "object1"\]/,
                "Should throw on unknown category.");
  Assert.throws(() => Telemetry.recordEvent("telemetry.test", "unknown", "object1"),
                /Error: Unknown event: \["telemetry.test", "unknown", "object1"\]/,
                "Should throw on unknown method.");
  Assert.throws(() => Telemetry.recordEvent("telemetry.test", "test1", "unknown"),
                /Error: Unknown event: \["telemetry.test", "test1", "unknown"\]/,
                "Should throw on unknown object.");

  let checkEvents = (events, expectedEvents) => {
    checkEventFormat(events);
    Assert.equal(events.length, expectedEvents.length,
                 "Snapshot should have the right number of events.");

    for (let i = 0; i < events.length; ++i) {
      let {tsBefore, tsAfter} = expectedEvents[i];
      let ts = events[i][0];
      Assert.greaterOrEqual(ts, tsBefore, "The recorded timestamp should be greater than the one before recording.");
      Assert.lessOrEqual(ts, tsAfter, "The recorded timestamp should be less than the one after recording.");

      let recordedData = events[i].slice(1);
      let expectedData = expectedEvents[i].event.slice();
      Assert.deepEqual(recordedData, expectedData, "The recorded event data should match.");
    }
  };

  // Check that the expected events were recorded.
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, false);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  checkEvents(snapshot.default, expected);

  // Check serializing only opt-out events.
  snapshot = Telemetry.snapshotBuiltinEvents(OPTOUT, false);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  let filtered = expected.filter(e => e.optout == true);
  checkEvents(snapshot.default, filtered);
});

add_task(function* test_clear() {
  Telemetry.clearEvents();

  const COUNT = 10;
  for (let i = 0; i < COUNT; ++i) {
    Telemetry.recordEvent("telemetry.test", "test1", "object1");
    Telemetry.recordEvent("telemetry.test.second", "test", "object1");
  }

  // Check that events were recorded.
  // The events are cleared by passing the respective flag.
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  Assert.equal(snapshot.default.length, 2 * COUNT, `Should have recorded ${2 * COUNT} events.`);

  // Now the events should be cleared.
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, false);
  Assert.equal(Object.keys(snapshot).length, 0, `Should have cleared the events.`);
});

add_task(function* test_expiry() {
  Telemetry.clearEvents();

  // Recording call with event that is expired by version.
  Telemetry.recordEvent("telemetry.test", "expired_version", "object1");
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event with expired version.");

  // Recording call with event that is expired by date.
  Telemetry.recordEvent("telemetry.test", "expired_date", "object1");
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event with expired date.");

  // Recording call with event that has expiry_version and expiry_date in the future.
  Telemetry.recordEvent("telemetry.test", "not_expired_optout", "object1");
  snapshot = Telemetry.snapshotBuiltinEvents(OPTOUT, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  Assert.equal(snapshot.default.length, 1, "Should record event when date and version are not expired.");
});

add_task(function* test_invalidParams() {
  Telemetry.clearEvents();

  // Recording call with wrong type for value argument.
  Telemetry.recordEvent("telemetry.test", "test1", "object1", 1);
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event when value argument with invalid type is passed.");

  // Recording call with wrong type for extra argument.
  Telemetry.recordEvent("telemetry.test", "test1", "object1", null, "invalid");
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event when extra argument with invalid type is passed.");

  // Recording call with unknown extra key.
  Telemetry.recordEvent("telemetry.test", "test1", "object1", null, {"key3": "x"});
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event when extra argument with invalid key is passed.");

  // Recording call with invalid value type.
  Telemetry.recordEvent("telemetry.test", "test1", "object1", null, {"key3": 1});
  snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.equal(Object.keys(snapshot).length, 0, "Should not record event when extra argument with invalid value type is passed.");
});

add_task(function* test_storageLimit() {
  Telemetry.clearEvents();

  // Record more events than the storage limit allows.
  let LIMIT = 1000;
  let COUNT = LIMIT + 10;
  for (let i = 0; i < COUNT; ++i) {
    Telemetry.recordEvent("telemetry.test", "test1", "object1", String(i));
  }

  // Check that the right events were recorded.
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  let events = snapshot.default;
  Assert.equal(events.length, LIMIT, `Should have only recorded ${LIMIT} events`);
  Assert.ok(events.every((e, idx) => e[4] === String(idx)),
            "Should have recorded all events from before hitting the limit.");
});

add_task(function* test_valueLimits() {
  Telemetry.clearEvents();

  // Record values that are at or over the limits for string lengths.
  let LIMIT = 80;
  let expected = [
    ["telemetry.test", "test1", "object1", "a".repeat(LIMIT - 10), null],
    ["telemetry.test", "test1", "object1", "a".repeat(LIMIT ), null],
    ["telemetry.test", "test1", "object1", "a".repeat(LIMIT + 1), null],
    ["telemetry.test", "test1", "object1", "a".repeat(LIMIT + 10), null],

    ["telemetry.test", "test1", "object1", null, {key1: "a".repeat(LIMIT - 10)}],
    ["telemetry.test", "test1", "object1", null, {key1: "a".repeat(LIMIT )}],
    ["telemetry.test", "test1", "object1", null, {key1: "a".repeat(LIMIT + 1)}],
    ["telemetry.test", "test1", "object1", null, {key1: "a".repeat(LIMIT + 10)}],
  ];

  for (let event of expected) {
    Telemetry.recordEvent(...event);
    if (event[3]) {
      event[3] = event[3].substr(0, LIMIT);
    }
    if (event[4]) {
      event[4].key1 = event[4].key1.substr(0, LIMIT);
    }
  }

  // Strip off trailing null values to match the serialized events.
  for (let e of expected) {
    while ((e.length >= 3) && (e[e.length - 1] === null)) {
      e.pop();
    }
  }

  // Check that the right events were recorded.
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  let events = snapshot.default;
  Assert.equal(events.length, expected.length,
               "Should have recorded the expected number of events");
  for (let i = 0; i < expected.length; ++i) {
    Assert.deepEqual(events[i].slice(1), expected[i],
                     "Should have recorded the expected event data.");
  }
});

add_task(function* test_unicodeValues() {
  Telemetry.clearEvents();

  // Record string values containing unicode characters.
  let value = "??????";
  Telemetry.recordEvent("telemetry.test", "test1", "object1", value);
  Telemetry.recordEvent("telemetry.test", "test1", "object1", null, {"key1": value});

  // Check that the values were correctly recorded.
  let snapshot = Telemetry.snapshotBuiltinEvents(OPTIN, true);
  Assert.ok(("default" in snapshot), "Should have entry for main process.");
  let events = snapshot.default;
  Assert.equal(events.length, 2, "Should have recorded 2 events.");
  Assert.equal(events[0][4], value, "Should have recorded the right value.");
  Assert.equal(events[1][5]["key1"], value, "Should have recorded the right extra value.");
});
