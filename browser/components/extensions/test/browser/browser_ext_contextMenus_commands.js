/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

add_task(function* () {
  function background() {
    browser.contextMenus.create({
      title: "open_browser_action",
      contexts: ["all"],
      command: "_execute_browser_action",
    });
    browser.contextMenus.create({
      title: "open_page_action",
      contexts: ["all"],
      command: "_execute_page_action",
    });
    browser.contextMenus.create({
      title: "open_sidebar_action",
      contexts: ["all"],
      command: "_execute_sidebar_action",
    });
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      browser.pageAction.show(tabId);
    });
    browser.test.sendMessage("ready");
  }

  function testScript() {
    window.onload = () => {
      browser.test.sendMessage("test-opened", true);
    };
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      "permissions": ["contextMenus", "activeTab", "tabs"],
      "browser_action": {
        "default_title": "Test BrowserAction",
        "default_popup": "test.html",
        "browser_style": true,
      },
      "page_action": {
        "default_title": "Test PageAction",
        "default_popup": "test.html",
        "browser_style": true,
      },
      "sidebar_action": {
        "default_title": "Test Sidebar",
        "default_panel": "test.html",
      },
    },
    background,
    files: {
      "test.html": `<!DOCTYPE html><meta charset="utf-8"><script src="test.js"></script>`,
      "test.js": testScript,
    },
  });

  function* testContext(id) {
    const menu = yield openExtensionContextMenu();
    const items = menu.getElementsByAttribute("label", id);
    yield closeExtensionContextMenu(items[0]);
    return extension.awaitMessage("test-opened");
  }

  yield extension.startup();
  yield extension.awaitMessage("ready");

  // open a page so page action works
  const PAGE = "http://mochi.test:8888/browser/browser/components/extensions/test/browser/context.html?test=commands";
  const tab = yield BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE);

  ok(yield testContext("open_sidebar_action"), "_execute_sidebar_action worked");
  ok(yield testContext("open_browser_action"), "_execute_browser_action worked");
  ok(yield testContext("open_page_action"), "_execute_page_action worked");

  yield BrowserTestUtils.removeTab(tab);
  yield extension.unload();
});
