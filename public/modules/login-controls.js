/* jshint browser: true, devel: true */
/* globals request, Promise, TOKEN, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'login-controls';

  register(NAME, function () {
    var context = this;
    var dom = context.dom;
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

    var loginButton = dom.elem('button', {
      text: 'Log In through Instagram',
      onClick: function () {
        loginRedirect();
      }
    });

    var flow = document.querySelector('#flow');
    var controls = flow.querySelector('.controls');

    events.on('flow:login', function () {
      dom.empty(controls);
      dom.append(controls, loginButton);
    });

    return function destroy() {};
  });
}(window.registerModule));
