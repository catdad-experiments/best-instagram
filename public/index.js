/* jshint browser: true, devel: true */
/* globals request, Promise, TOKEN */

window.addEventListener('load', function () {
  var CLIENT_ID = '1cce8de545d54a14bde4272118af4b54';
  var REDIRECT_URI = encodeURIComponent('https://visualstupid.now.sh/instagram/login');

  function renderMustache(str, obj) {
    return Object.keys(obj).reduce(function (memo, key) {
      var value = obj[key];
      var regex = new RegExp('\\$\\{' + key + '\\}', 'g');

      return memo.replace(regex, value);
    }, str);
  }

  function loginRedirect() {
    window.location.href = renderMustache(
      'https://api.instagram.com/oauth/authorize/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code',
      {
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI
      }
    );
  }

  var api = {
    media: function (sinceId) {
      return new Promise(function (resolve, reject) {
        var url = renderMustache(
          'https://api.instagram.com/v1/users/self/media/recent/?access_token=${token}',
          {
            token: TOKEN
          }
        );

        if (sinceId) {
          url += '&max_id=' + sinceId;
        }

        request.jsonp({
          url: url,
          unknownErrors: true
        }, function (err, body) {
          if (err) {
            return reject(err);
          }

          if (body.meta && body.meta.code !== 200) {
            return reject(new Error('unknown meta code ' + body.meta.code));
          }

          return resolve(body);
        });
      });
    },
    photos: function (sinceId) {
      return api.media(sinceId).then(function (body) {
        if (body.data.length === 0) {
          return [];
        }

        return body.data.filter(function (post) {
          return post.type === 'image';
        });
      });
    }
  };

  var loginButton = document.querySelector('#login');
  var quickRangeButtons = document.querySelectorAll('.get-images');
  var imagesDiv = document.querySelector('#images');

  loginButton.onclick = function () {
    loginRedirect();
  };

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

  // add some helpers to a post summary object
  function createPostObject(post) {
    var base64Str;

    function getBase64() {
      if (base64Str) {
        return Promise.resolve(base64Str);
      }

      return getLoadedImage(post.imageUrl).then(function (img) {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        canvas.getContext('2d').drawImage(img, 0, 0);

        base64Str = canvas.toDataURL('image/png');

        return Promise.resolve(base64Str);
      });
    }

    function discardBase64() {
      base64Str = null;
    }

    function hasBase64() {
      return !!base64Str;
    }

    return Object.assign({
      getBase64: getBase64,
      discardBase64: discardBase64,
      hasBase64: hasBase64
    }, post);
  }

  // create friendly summary objects for all posts,
  // with only props and util I actually care about
  function summarize(posts) {
    return posts.map(function (post) {
      // add helper methods in a separate function,
      // so that we do not keep the whole posts array
      // in scope memory
      return createPostObject({
        id: post.id,
        likes: post.likes.count,
        comments: post.comments.count,
        imageUrl: post.images.standard_resolution.url,
        datetime: new Date(post.created_time * 1000)
      });
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

  function getImagesForRange(minDate, maxDate) {
    if (!minDate) {
      minDate = 1;
    }

    if (!maxDate) {
      maxDate = Date.now();
    }

    var allPosts = [];
    var min = new Date(minDate);
    var max = new Date(maxDate);

    return api.photos()
    .then(function handleBody(posts) {
      if (!posts.length) {
        return;
      }

      var summaries = summarize(posts);

      // keep track of all posts we've retrieved
      // and sort them
      allPosts = allPosts.concat(summaries.filter(function (post) {
        return post.datetime > min && post.datetime < max;
      }));
      allPosts.sort(function (a, b) {
        // most likes first
        return b.likes - a.likes;
      });

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
      }).then(function () {
        var lastPost = summaries[summaries.length - 1];

        // Instagram only allows ~6 months of photos in recent,
        // so just get them all... this could be a bad idea at
        // some point, but oh well.
        return api.photos(lastPost.id).then(handleBody);
      });
    });
  }

  [].forEach.call(quickRangeButtons, function (button) {
    var year = button.getAttribute('data-year');
    var days = button.getAttribute('data-days');
    var minDate, maxDate;

    // convert to a number
    if (year) {
      year = Number(year);
    }

    // use the year to generate date range
    if (year) {
      // for simplicity, we'll assume that the user posted
      // in the same timezone that they are using this
      // app from
      minDate = (new Date(renderMustache('${year}-01-01T00:00:00', { year: year }))).getTime();
      maxDate = (new Date(renderMustache('${year}-01-01T00:00:00', { year: year + 1 }))).getTime();
    }

    if (days) {
      days = Number(days);
    }

    if (days) {
      minDate = Date.now() - (846e5 * days);
      maxDate = Date.now();
    }

    button.onclick = function () {
      getImagesForRange(minDate, maxDate).then(function () {
        console.log('image generated');
      }).catch(function (err) {
        console.error(err);
      });
    };
  });

});
