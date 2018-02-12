/* jshint browser: true */
/* globals request, Promise, TOKEN, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'instagram-api';
  var renderMustache;

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

  register(NAME, function () {
    var context = this;
    var events = context.events;

    renderMustache = context.renderMustache;

    context.getInstagramPosts = function (opts) {
      // eh... stream-like
      var stream = context.newEmitter();

      var minDate = opts.min || 1;
      var maxDate = opts.max || Date.now();

      var allPosts = [];
      var min = new Date(minDate);
      var max = new Date(maxDate);

      api.photos()
      .then(function handleBody(posts) {
        if (!posts.length) {
          stream.emit('end');
          return;
        }

        var summaries = summarize(posts).filter(function (post) {
          return post.datetime > min && post.datetime < max;
        });

        if (!summaries.length) {
          stream.emit('end');
          return;
        }

        stream.emit('data', summaries);

        var lastPost = summaries[summaries.length - 1];

        // Instagram only allows ~6 months of photos in recent,
        // so just get them all... this could be a bad idea at
        // some point, but oh well.
        return api.photos(lastPost.id).then(handleBody);
      }).catch(function (err) {
        stream.emit('error', err);
      });

      return stream;
    };
  });

}(window.registerModule));
