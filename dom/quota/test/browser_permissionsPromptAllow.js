/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const testPageURL =
  "https://example.com/browser/dom/quota/test/browser_permissionsPrompt.html";

add_task(function* testPermissionAllow() {
  removePermission(testPageURL, "persistent-storage");
  info("Creating tab");
  gBrowser.selectedTab = gBrowser.addTab();

  info("Loading test page: " + testPageURL);
  gBrowser.selectedBrowser.loadURI(testPageURL);
  yield BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  registerPopupEventHandler("popupshowing", function () {
    ok(true, "prompt showing");
  });
  registerPopupEventHandler("popupshown", function () {
    ok(true, "prompt shown");
    triggerMainCommand(this);
  });
  registerPopupEventHandler("popuphidden", function () {
    ok(true, "prompt hidden");
  });

  yield promiseMessage(true, gBrowser);

  is(getPermission(testPageURL, "persistent-storage"),
     Components.interfaces.nsIPermissionManager.ALLOW_ACTION,
     "Correct permission set");
  gBrowser.removeCurrentTab();
  unregisterAllPopupEventHandlers();
  // Keep persistent-storage permission for the next test.
});

add_task(function* testNoPermissionPrompt() {
  info("Creating tab");
  gBrowser.selectedTab = gBrowser.addTab();

  info("Loading test page: " + testPageURL);
  gBrowser.selectedBrowser.loadURI(testPageURL);
  yield BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  registerPopupEventHandler("popupshowing", function () {
    ok(false, "Shouldn't show a popup this time");
  });
  registerPopupEventHandler("popupshown", function () {
    ok(false, "Shouldn't show a popup this time");
  });
  registerPopupEventHandler("popuphidden", function () {
    ok(false, "Shouldn't show a popup this time");
  });

  yield promiseMessage(true, gBrowser);

  is(getPermission(testPageURL, "persistent-storage"),
     Components.interfaces.nsIPermissionManager.ALLOW_ACTION,
     "Correct permission set");
  gBrowser.removeCurrentTab();
  unregisterAllPopupEventHandlers();
  removePermission(testPageURL, "persistent-storage");
});
