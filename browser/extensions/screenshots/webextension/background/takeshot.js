/* globals communication, shot, main, auth, catcher, analytics, browser */

"use strict";

this.takeshot = (function () {
  let exports = {};
  const Shot = shot.AbstractShot;
  const { sendEvent } = analytics;

  communication.register("takeShot", catcher.watchFunction((sender, options) => {
    let { captureType, captureText, scroll, selectedPos, shotId, shot } = options;
    shot = new Shot(main.getBackend(), shotId, shot);
    let capturePromise = Promise.resolve();
    let openedTab;
    if (! shot.clipNames().length) {
      // canvas.drawWindow isn't available, so we fall back to captureVisibleTab
      capturePromise = screenshotPage(selectedPos, scroll).then((dataUrl) => {
        shot.addClip({
          createdDate: Date.now(),
          image: {
            url: dataUrl,
            captureType,
            text: captureText,
            location: selectedPos,
            dimensions: {
              x: selectedPos.right - selectedPos.left,
              y: selectedPos.bottom - selectedPos.top
            }
          }
        });
      });
    }
    let shotAbTests = {};
    let abTests = auth.getAbTests();
    for (let testName of Object.keys(abTests)) {
      if (abTests[testName].shotField) {
        shotAbTests[testName] = abTests[testName].value;
      }
    }
    if (Object.keys(shotAbTests).length) {
      shot.abTests = shotAbTests;
    }
    return catcher.watchPromise(capturePromise.then(() => {
      return browser.tabs.create({url: shot.creatingUrl})
    }).then((tab) => {
      openedTab = tab;
      return uploadShot(shot);
    }).then(() => {
      return browser.tabs.update(openedTab.id, {url: shot.viewUrl});
    }).then(() => {
      return shot.viewUrl;
    }).catch((error) => {
      browser.tabs.remove(openedTab.id);
      throw error;
    }));
  }));

  communication.register("screenshotPage", (sender, selectedPos, scroll) => {
    return screenshotPage(selectedPos, scroll);
  });

  function screenshotPage(pos, scroll) {
    pos = {
      top: pos.top - scroll.scrollY,
      left: pos.left - scroll.scrollX,
      bottom: pos.bottom - scroll.scrollY,
      right: pos.right - scroll.scrollX
    };
    pos.width = pos.right - pos.left;
    pos.height = pos.bottom - pos.top;
    return catcher.watchPromise(browser.tabs.captureVisibleTab(
      null,
      {format: "png"}
    ).then((dataUrl) => {
      let image = new Image();
      image.src = dataUrl;
      return new Promise((resolve, reject) => {
        image.onload = catcher.watchFunction(() => {
          let xScale = image.width / scroll.innerWidth;
          let yScale = image.height / scroll.innerHeight;
          let canvas = document.createElement("canvas");
          canvas.height = pos.height * yScale;
          canvas.width = pos.width * xScale;
          let context = canvas.getContext("2d");
          context.drawImage(
            image,
            pos.left * xScale, pos.top * yScale,
            pos.width * xScale, pos.height * yScale,
            0, 0,
            pos.width * xScale, pos.height * yScale
          );
          let result = canvas.toDataURL();
          resolve(result);
        });
      });
    }));
  }

  function uploadShot(shot) {
    return auth.authHeaders().then((headers) => {
      headers["content-type"] = "application/json";
      let body = JSON.stringify(shot.asJson());
      let req = new Request(shot.jsonUrl, {
        method: "PUT",
        mode: "cors",
        headers,
        body
      });
      sendEvent("upload", "started", {eventValue: Math.floor(body.length / 1000)});
      return fetch(req);
    }).then((resp) => {
      if (! resp.ok) {
        sendEvent("upload-failed", `status-${resp.status}`);
        let exc = new Error(`Response failed with status ${resp.status}`);
        exc.popupMessage = "REQUEST_ERROR";
        throw exc;
      } else {
        sendEvent("upload", "success");
      }
    }, (error) => {
      // FIXME: I'm not sure what exceptions we can expect
      sendEvent("upload-failed", "connection");
      throw error;
    });
  }

  return exports;
})();
