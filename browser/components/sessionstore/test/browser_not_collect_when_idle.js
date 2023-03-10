/** Test for Bug 1305950 **/

Cu.import("resource://testing-common/MockRegistrar.jsm", this);

// The mock idle service.
var idleService = {
  _observers: new Set(),
  _activity: {
    addCalls: [],
    removeCalls: [],
    observerFires: [],
  },

  _reset() {
    this._observers.clear();
    this._activity.addCalls = [];
    this._activity.removeCalls = [];
    this._activity.observerFires = [];
  },

  _fireObservers(state) {
    for (let observer of this._observers.values()) {
      observer.observe(observer, state, null);
      this._activity.observerFires.push(state);
    }
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIIdleService]),
  idleTime: 19999,

  addIdleObserver(observer, time) {
    this._observers.add(observer);
    this._activity.addCalls.push(time);
  },

  removeIdleObserver(observer, time) {
    this._observers.delete(observer);
    this._activity.removeCalls.push(time);
  }
};

add_task(async function testIntervalChanges() {
  const PREF_SS_INTERVAL = 2000;

  // We speed up the interval between session saves to ensure that the test
  // runs quickly.
  Services.prefs.setIntPref("browser.sessionstore.interval", PREF_SS_INTERVAL);

  // Increase `idleDelay` to 1 day to update the pre-registered idle observer
  // in "real" idle service to avoid possible interference, especially for the
  // CI server environment.
  Services.prefs.setIntPref("browser.sessionstore.idleDelay", 86400000);

  // Mock an idle service.
  let fakeIdleService = MockRegistrar.register("@mozilla.org/widget/idleservice;1", idleService);
  idleService._reset();

  registerCleanupFunction(function() {
    Services.prefs.clearUserPref("browser.sessionstore.interval");
    MockRegistrar.unregister(fakeIdleService);
  });

  // Hook idle/active observer to mock idle service by changing pref `idleDelay`
  // to a whatever value, which will not be used.
  Services.prefs.setIntPref("browser.sessionstore.idleDelay", 5000000);

  // Wait a `sessionstore-state-write-complete` event from any previous
  // scheduled state write. This is needed since the `_lastSaveTime` in
  // runDelayed() should be set at least once, or the `_isIdle` flag will not
  // become effective.
  // We wait at most 30 sec which is about as long as the timeout for the
  // regular whole test case, and we don't expect the write event comes fast
  // enough for an immediate `waitForSaveState()` from now.
  await new Promise(function(resolve, reject) {
    waitForTopic("sessionstore-state-write-complete", 30 * 1000, function(isSuccessful) {
      if (!isSuccessful) {
        reject(new Error("Timeout: didn't get any `sessionstore-state-write-complete` event"));
      } else {
        resolve();
      }
    });
  });

  info("Got the state write event, start to test idle mode...");

  // Enter the "idle mode" (raise the `_isIdle` flag) by firing idle
  // observer of mock idle service.
  idleService._fireObservers("idle");

  // Cancel any possible state save, which is not related with this test to
  // avoid interference.
  SessionSaver.cancel();

  let p1 = promiseSaveState();

  // Schedule a state write, which is expeced to be postponed after about
  // `browser.sessionstore.interval.idle` ms, since the idle flag was just set.
  SessionSaver.runDelayed(0);

  // We expect `p1` hits the timeout.
  await Assert.rejects(p1, null, "[Test 1A] No state write during idle.");

  // Test again for better reliability. Same, we expect following promise hits
  // the timeout.
  await Assert.rejects(promiseSaveState(), null, "[Test 1B] Again: No state write during idle.");

  // Back to the active mode.
  info("Start to test active mode...");
  idleService._fireObservers("active");

  await new Promise(function(resolve, reject) {
    waitForTopic("sessionstore-state-write-complete", PREF_SS_INTERVAL + 10000, function(isSuccessful) {
      if (!isSuccessful) {
        reject(new Error("Timeout: didn't get any `sessionstore-state-write-complete` event"));
      } else {
        resolve();
      }
    });
  });
  info("[Test 2] Has state write during active.");
});

