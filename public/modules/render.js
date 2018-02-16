/* jshint browser: true */
/* globals request, Promise, TOKEN, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'render';

  // this is the size that instagram serves (as the width)
  var SIZE =  640;

  var imagesDiv = document.querySelector('#images');

  // TODO make this a helper
  // get an image object with the source already loaded
  function getLoadedImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      // allows us to get these off of the Instagram
      // servers directly
      img.setAttribute('crossOrigin', 'Anonymous');

      img.onload = function () {
        resolve(img);
      };

      img.onerror = function (err) {
        reject(new Error('could not load the image'));
      };

      img.src = src;
    });
  }

  function getCanvasCoordinates(idx) {
    return {
      dx: (SIZE * (idx % 3)),
      dy: SIZE * Math.floor(idx / 3),
      width: SIZE,
      height: SIZE
    };
  }

  // take the list of posts and render them to the page,
  // for the user's delight
  function renderToCanvas(sortedPosts) {
    return Promise.all(sortedPosts.map(function (post) {
      // this is a bit round-about, but we want to get a base64 string,
      // so that we can use that to create a clean image to use
      // in the collage canvas
      return post.getBase64().then(function (base64) {
        return getLoadedImage(base64);
      });
    })).then(function (images) {
      var canvas = document.createElement('canvas');

      // destination size dimension
      var dim = SIZE;
      canvas.width = SIZE * 3;
      canvas.height = SIZE * 3;

      var context = canvas.getContext('2d');
      var dx, dy = 0;

      images.forEach(function (img, idx) {
        var canvasSize = getCanvasCoordinates(idx);

        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var sx = 0;
        var sy = 0;

        // instagram always serves images with 640 width and
        // variable height
        if (h > w) {
          // portrait photo
          sy = (h - w) / 2;
          dim = w;
        }

        if (h < w) {
          // landscape photo
          sx = (w - h) / 2;
          dim = h;
        }

        context.drawImage(img, sx, sy, dim, dim, canvasSize.dx, canvasSize.dy, SIZE, SIZE);
      });

      return Promise.resolve(canvas);
    });
  }

  function renderStatsToCanvas(sortedPosts, canvas) {
    var context = canvas.getContext('2d');
    var viewBox = '0 0 ' + (SIZE * 3) + ' ' + (SIZE * 3);

    function offsetX(x) {
      return x + 20;
    }

    function offsetY(y) {
      return y + SIZE - 20;
    }

    var str = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" ' +
      'font-family="sans-serif" fill="white" stroke="black" font-size="42pt">' +
      sortedPosts.reduce(function (str, post, idx) {
        var canvasSize = getCanvasCoordinates(idx);

        return str + '<text x="' + offsetX(canvasSize.dx) + '" y="' + offsetY(canvasSize.dy) + '">' +
          'L ' + post.likes + ', C ' + post.comments +
          '</text>';
      }, '') +
    '</svg>';

    return getLoadedImage('data:image/svg+xml;base64,' + btoa(str)).then(function (img) {
      context.drawImage(img, 0, 0, SIZE * 3, SIZE * 3);

      return Promise.resolve(canvas);
    });
  }

  function collectBestPosts(stream) {
    return new Promise(function (resolve, reject) {
      var allPosts = [];

      stream.on('data', function (posts) {
        // keep track of all posts we've retrieved
        // and sort them
        allPosts = allPosts.concat(posts);
        allPosts.sort(function (a, b) {
          // most likes first
          return b.likes - a.likes;
        });
      });

      stream.on('end', function () {
        // do nothing, for now, if we don't have enough posts
        if (allPosts.length < 9) {
          return reject(new Error('not enough posts'));
        }

        resolve(allPosts.slice(0, 9));
      });

      stream.on('error', function (err) {
        reject(err);
      });
    });
  }

  register(NAME, function () {
    var context = this;
    var dom = context.dom;
    var message = context.message;
    var events = context.events;

    var renderStats = false;

    function progress(text) {
      dom.empty(imagesDiv);
      dom.append(imagesDiv, dom.text(text));
    }

    function renderImageStream(stream) {
      return collectBestPosts(stream).then(function (allPosts) {
        // get a rendered dom element with the image
        return renderToCanvas(allPosts).then(function (canvas) {
          if (!renderStats) {
            return Promise.resolve(canvas);
          }

          return renderStatsToCanvas(allPosts, canvas);
        });
      }).then(function (canvas) {
        // get the data from the canvas and render it as an
        // image element
        return getLoadedImage(canvas.toDataURL('image/png')).then(function (img) {
          dom.empty(imagesDiv);
          dom.append(imagesDiv, img);
        });
      });
    }

    events.on('create-render', function (opts) {
      var stream = context.getInstagramPosts(opts);
      var totalCount = 0;

      progress('Fetching posts...');

      stream.on('data', function (posts) {
        totalCount += posts.length;
        progress('Fetched ' + totalCount + ' posts...');
      });

      stream.on('end', function () {
        progress('Almost done...');
      });

      renderImageStream(stream)
      .then(function () {
      })
      .catch(function (err) {
        dom.empty(imagesDiv);
        message.error(err);
      });
    });

    return function destroy() {};
  });
}(window.registerModule));
