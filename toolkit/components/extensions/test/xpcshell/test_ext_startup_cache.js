/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

Cu.import("resource://gre/modules/Preferences.jsm");

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();

AddonTestUtils.createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1", "42");

const ADDON_ID = "test-startup-cache@xpcshell.mozilla.org";

function makeExtension(opts) {
  return {
    useAddonManager: "permanent",

    manifest: {
      "version": opts.version,
      "applications": {"gecko": {"id": ADDON_ID}},

      "name": "__MSG_name__",

      "default_locale": "en_US",
    },

    files: {
      "_locales/en_US/messages.json": {
        name: {
          message: `en-US ${opts.version}`,
          description: "Name.",
        },
      },
      "_locales/fr/messages.json": {
        name: {
          message: `fr ${opts.version}`,
          description: "Name.",
        },
      },
    },

    background() {
      browser.test.onMessage.addListener(msg => {
        if (msg === "get-manifest") {
          browser.test.sendMessage("manifest", browser.runtime.getManifest());
        }
      });
    },
  };
}

add_task(function* () {
  Preferences.set("extensions.logging.enabled", false);
  yield AddonTestUtils.promiseStartupManager();

  let extension = ExtensionTestUtils.loadExtension(
    makeExtension({version: "1.0"}));

  function getManifest() {
    extension.sendMessage("get-manifest");
    return extension.awaitMessage("manifest");
  }


  yield extension.startup();

  equal(extension.version, "1.0", "Expected extension version");
  let manifest = yield getManifest();
  equal(manifest.name, "en-US 1.0", "Got expected manifest name");


  do_print("Restart and re-check");
  yield AddonTestUtils.promiseRestartManager();
  yield extension.awaitStartup();

  equal(extension.version, "1.0", "Expected extension version");
  manifest = yield getManifest();
  equal(manifest.name, "en-US 1.0", "Got expected manifest name");


  do_print("Change locale to 'fr' and restart");
  Preferences.set("general.useragent.locale", "fr");
  yield AddonTestUtils.promiseRestartManager();
  yield extension.awaitStartup();

  equal(extension.version, "1.0", "Expected extension version");
  manifest = yield getManifest();
  equal(manifest.name, "fr 1.0", "Got expected manifest name");


  do_print("Update to version 1.1");
  yield extension.upgrade(makeExtension({version: "1.1"}));

  equal(extension.version, "1.1", "Expected extension version");
  manifest = yield getManifest();
  equal(manifest.name, "fr 1.1", "Got expected manifest name");


  do_print("Change locale to 'en-US' and restart");
  Preferences.set("general.useragent.locale", "en-US");
  yield AddonTestUtils.promiseRestartManager();
  yield extension.awaitStartup();

  equal(extension.version, "1.1", "Expected extension version");
  manifest = yield getManifest();
  equal(manifest.name, "en-US 1.1", "Got expected manifest name");


  yield extension.unload();
});
