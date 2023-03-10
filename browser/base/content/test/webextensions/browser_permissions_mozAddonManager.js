"use strict";

const INSTALL_PAGE = `${BASE}/file_install_extensions.html`;

async function installMozAM(filename) {
  gBrowser.selectedBrowser.loadURI(INSTALL_PAGE);
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  await ContentTask.spawn(gBrowser.selectedBrowser, `${BASE}/${filename}`, function*(url) {
    yield content.wrappedJSObject.installMozAM(url);
  });
}

add_task(() => testInstallMethod(installMozAM, "installAmo"));
