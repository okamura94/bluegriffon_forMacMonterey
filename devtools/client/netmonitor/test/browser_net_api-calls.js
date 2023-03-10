/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests whether API call URLs (without a filename) are correctly displayed
 * (including Unicode)
 */

add_task(function* () {
  let { tab, monitor } = yield initNetMonitor(API_CALLS_URL);
  info("Starting test... ");

  let { document, gStore, windowRequire } = monitor.panelWin;
  let Actions = windowRequire("devtools/client/netmonitor/src/actions/index");
  let {
    getDisplayedRequests,
    getSortedRequests,
  } = windowRequire("devtools/client/netmonitor/src/selectors/index");

  gStore.dispatch(Actions.batchEnable(false));

  const REQUEST_URIS = [
    "http://example.com/api/fileName.xml",
    "http://example.com/api/file%E2%98%A2.xml",
    "http://example.com/api/ascii/get/",
    "http://example.com/api/unicode/%E2%98%A2/",
    "http://example.com/api/search/?q=search%E2%98%A2"
  ];

  let wait = waitForNetworkEvents(monitor, 5);
  yield ContentTask.spawn(tab.linkedBrowser, {}, function* () {
    content.wrappedJSObject.performRequests();
  });
  yield wait;

  REQUEST_URIS.forEach(function (uri, index) {
    verifyRequestItemTarget(
      document,
      getDisplayedRequests(gStore.getState()),
      getSortedRequests(gStore.getState()).get(index),
      "GET",
      uri
     );
  });

  yield teardown(monitor);
});
