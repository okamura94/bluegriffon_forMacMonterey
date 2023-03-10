/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * This file tests support for icons with multiple frames (like .ico files).
 */

add_task(function* () {
  //  in: 48x48 ico, 56646 bytes.
  // (howstuffworks.com icon, contains 13 icons with sizes from 16x16 to
  // 48x48 in varying depths)
  let pageURI = NetUtil.newURI("http://places.test/page/");
  yield PlacesTestUtils.addVisits(pageURI);
  let faviconURI = NetUtil.newURI("http://places.test/icon/favicon-multi.ico");
  // Fake window.
  let win = { devicePixelRatio: 1.0 };
  let icoData = readFileData(do_get_file("favicon-multi.ico"));
  PlacesUtils.favicons.replaceFaviconData(faviconURI, icoData, icoData.length,
                                          "image/x-icon");
  yield setFaviconForPage(pageURI, faviconURI);

  for (let size of [16, 32, 64]) {
    let file = do_get_file(`favicon-multi-frame${size}.png`);
    let data = readFileData(file);

    do_print("Check getFaviconDataForPage");
    let icon = yield getFaviconDataForPage(pageURI, size);
    Assert.equal(icon.mimeType, "image/png");
    Assert.deepEqual(icon.data, data);

    do_print("Check moz-anno:favicon protocol");
    yield compareFavicons(
      Services.io.newFileURI(file),
      PlacesUtils.urlWithSizeRef(win, PlacesUtils.favicons.getFaviconLinkForIcon(faviconURI).spec, size)
    );

    do_print("Check page-icon protocol");
    yield compareFavicons(
      Services.io.newFileURI(file),
      PlacesUtils.urlWithSizeRef(win, "page-icon:" + pageURI.spec, size)
    );
  }
});
