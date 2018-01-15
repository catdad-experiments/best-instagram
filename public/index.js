/* jshint browser: true */
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
        request.jsonp(url, function (err, resp, body) {
          if (err) {
            return reject(err);
          }

          return resolve(body);
        });
      });
    }
  };

  var loginButton = document.querySelector('#login');

  loginButton.onclick = function () {
    loginRedirect();
  };

});
