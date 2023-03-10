/*
 * Bug 1330882 - A test case for setting window size through window.innerWidth/Height
 *   and window.outerWidth/Height when fingerprinting resistance is enabled. This
 *   test is for maximum values.
 */

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu } = Components;

const TEST_DOMAIN = "http://example.net/";
const TEST_PATH = TEST_DOMAIN + "browser/browser/components/resistFingerprinting/test/browser/";

let gMaxAvailWidth;
let gMaxAvailHeight;

// We need the chrome UI size of popup windows for testing outerWidth/Height.
let gPopupChromeUIWidth;
let gPopupChromeUIHeight;

const TESTCASES = [
  { settingWidth: 1025, settingHeight: 1050, targetWidth: 1000, targetHeight: 1000,
    initWidth: 200, initHeight: 100 },
  { settingWidth: 9999, settingHeight: 9999, targetWidth: 1000, targetHeight: 1000,
    initWidth: 200, initHeight: 100  },
  { settingWidth: 999, settingHeight: 999, targetWidth: 1000, targetHeight: 1000,
    initWidth: 200, initHeight: 100  },
];

add_task(function* setup() {
  yield SpecialPowers.pushPrefEnv({"set":
    [["privacy.resistFingerprinting", true]]
  });

  // Calculate the popup window's chrome UI size for tests of outerWidth/Height.
  let popUpChromeUISize = yield calcPopUpWindowChromeUISize();

  gPopupChromeUIWidth = popUpChromeUISize.chromeWidth;
  gPopupChromeUIHeight = popUpChromeUISize.chromeHeight;

  // Calculate the maximum available size.
  let maxAvailSize = yield calcMaximumAvailSize(gPopupChromeUIWidth,
                                                gPopupChromeUIHeight);

  gMaxAvailWidth = maxAvailSize.maxAvailWidth;
  gMaxAvailHeight = maxAvailSize.maxAvailHeight;
});

add_task(function* test_window_size_setting() {
  // Open a tab to test.
  let tab = yield BrowserTestUtils.openNewForegroundTab(
    gBrowser, TEST_PATH + "file_dummy.html");

  for (let test of TESTCASES) {
    // Test window.innerWidth and window.innerHeight.
    yield testWindowSizeSetting(tab.linkedBrowser, test.settingWidth, test.settingHeight,
                                test.targetWidth, test.targetHeight, test.initWidth,
                                test.initHeight, false, gMaxAvailWidth, gMaxAvailHeight,
                                gPopupChromeUIWidth, gPopupChromeUIHeight);

    // test window.outerWidth and window.outerHeight.
    yield testWindowSizeSetting(tab.linkedBrowser, test.settingWidth, test.settingHeight,
                                test.targetWidth, test.targetHeight, test.initWidth,
                                test.initHeight, true, gMaxAvailWidth, gMaxAvailHeight,
                                gPopupChromeUIWidth, gPopupChromeUIHeight);
  }

  yield BrowserTestUtils.removeTab(tab);
});
