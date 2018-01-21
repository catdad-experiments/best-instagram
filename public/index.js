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

  function date(createdTime) {
    return new Date(createdTime * 1000);
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
  var getImagesButton = document.querySelector('#get-images');
  var imagesDiv = document.querySelector('#images');

  loginButton.onclick = function () {
    loginRedirect();
  };

  function image(url) {
    var img = document.createElement('img');
    img.src = url;

    return img;
  }

  function svg(urls) {
    return renderMustache(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 99">' +
        '<image width="33" height="33" x="0"  y="0"  xlink:href="${0}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="33" y="0"  xlink:href="${1}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="66" y="0"  xlink:href="${2}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="0"  y="33" xlink:href="${3}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="33" y="33" xlink:href="${4}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="66" y="33" xlink:href="${5}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="0"  y="66" xlink:href="${6}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="33" y="66" xlink:href="${7}" preserveAspectRatio="xMidYMid slice" />' +
        '<image width="33" height="33" x="66" y="66" xlink:href="${8}" preserveAspectRatio="xMidYMid slice" />' +
      '</svg>', urls);
  }

  function summarize(posts) {
    return posts.map(function (post) {
      return {
        id: post.id,
        likes: post.likes.count,
        comments: post.comments.count,
        imageUrl: post.images.standard_resolution.url,
        datetime: new Date(post.created_time * 1000)
      };
    });
  }

  getImagesButton.onclick = function () {
    var allPosts = [];

    api.photos()
    .then(function handleBody(posts) {
      if (!posts.length) {
        return;
      }

      allPosts = allPosts.concat(summarize(posts));

      allPosts.sort(function (a, b) {
        // most likes first
        return b.likes - a.likes;
      });

      var nine = allPosts.slice(0, 9).map(function (post) {
        return post.imageUrl;
      });

      var content = svg(nine);

      imagesDiv.innerHTML = content;

//      posts.forEach(function (post) {
//        imagesDiv.appendChild(image(post.images.standard_resolution.url));
//      });

//      if (count < 25) {
//        var lastId = posts[posts.length - 1].id;
//
//        return api.photos(lastId).then(handleBody);
//      }
    }).catch(function (err) {
      console.log(err);
    });
  };

});
