/* jshint browser: true */
/* globals request, Promise, TOKEN, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'render';
  var renderMustache;

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

  // take the list of posts and render them to the page,
  // for the user's delight
  function renderToCanvas(sortedPosts) {
    // do nothing, for now, if we don't have enough posts
    if (sortedPosts.length < 9) {
      return Promise.reject(new Error('not enough posts'));
    }

    return Promise.all(sortedPosts.slice(0, 9).map(function (post) {
      // this is a bit round-about, but we want to get a base64 string,
      // so that we can use that to create a clean image to use
      // in the collage canvas
      return post.getBase64().then(function (base64) {
        return getLoadedImage(base64);
      });
    })).then(function (images) {
      var canvas = document.createElement('canvas');

      // this is the size that instagram serves (as the width)
      var size = 640;
      canvas.width = size * 3;
      canvas.height = size * 3;

      var context = canvas.getContext('2d');
      var dx, dy = 0;

      images.forEach(function (img, idx) {
        var i = (idx) % 3;
        dx = size * i;

        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var sx = 0;
        var sy = 0;

        // instagram always serves images with 640 width and
        // variable height
        if (h > w) {
          sy = (h - w) / 2;
        }

        // just in case they reverse the above in the future,
        // handle 640 height with variable width too
        if (w > h) {
          sx = (w - h) / 2;
        }

        context.drawImage(img, sx, sy, size, size, dx, dy, size, size);

        // when we reach the end of the row,
        // update to use the next row
        if (i === 2) {
          dy += size;
        }
      });

      return Promise.resolve(canvas);
    });
  }

  function renderImageStream(stream) {
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
      // get a rendered dom element with the image
      return renderToCanvas(allPosts).then(function (canvas) {
        if (!canvas) {
          return;
        }

        // get the data from the canvas and render it as an
        // image element
        return getLoadedImage(canvas.toDataURL('image/png')).then(function (img) {
          imagesDiv.innerHTML = '';
          imagesDiv.appendChild(img);
        });
      });
    });
  }

  register(NAME, function () {
    var context = this;
    var message = context.message;
    var events = context.events;

    renderMustache = context.renderMustache;

    events.on('create-render', function (opts) {
      var stream = context.getInstagramPosts(opts);

      renderImageStream(stream);

      stream.on('error', function (err) {
        message.error(err);
      });
    });

    return function destroy() {};
  });
}(window.registerModule));
