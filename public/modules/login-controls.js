/* jshint browser: true, devel: true */
/* globals request, Promise, TOKEN, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'login-controls';

  register(NAME, function () {
    var context = this;
    var message = context.message;
    var renderMustache = context.renderMustache;
    var events = context.events;

    function loginRedirect() {
      window.location.href = renderMustache(
        'https://api.instagram.com/oauth/authorize/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code',
        {
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI
        }
      );
    }

    var loginButton = document.querySelector('#login');

    loginButton.onclick = function () {
      loginRedirect();
    };

    return function destroy() {};
  });
}(window.registerModule));
