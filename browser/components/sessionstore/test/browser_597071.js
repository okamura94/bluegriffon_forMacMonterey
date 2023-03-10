/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Bug 597071 - Closed windows should only be resurrected when there is a single
 * popup window
 */
add_task(function* test_close_last_nonpopup_window() {
  // Purge the list of closed windows.
  forgetClosedWindows();

  let oldState = ss.getWindowState(window);

  let popupState = {windows: [
    {tabs: [{entries: []}], isPopup: true, hidden: "toolbar"}
  ]};

  // Set this window to be a popup.
  ss.setWindowState(window, JSON.stringify(popupState), true);

  // Open a new window with a tab.
  let win = yield BrowserTestUtils.openNewBrowserWindow({private: false});
  let tab = win.gBrowser.addTab("http://example.com/");
  yield BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  // Make sure sessionstore sees this window.
  let state = JSON.parse(ss.getBrowserState());
  is(state.windows.length, 2, "sessionstore knows about this window");

  // Closed the window and check the closed window count.
  yield BrowserTestUtils.closeWindow(win);
  is(ss.getClosedWindowCount(), 1, "correct closed window count");

  // Cleanup.
  ss.setWindowState(window, oldState, true);
});
