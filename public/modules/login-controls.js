/* jshint browser: true, devel: true */
/* globals Promise, CLIENT_ID, REDIRECT_URI */

(function (register) {
  var NAME = 'login-controls';

  register(NAME, function () {
    var context = this;
    var dom = context.dom;
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

    var loginButton = dom.elem('button', {
      text: 'Log In through Instagram',
      onClick: function () {
        loginRedirect();
      }
    });

    var controls = dom.elem('div', {
      className: 'controls',
      children: loginButton
    });

    var contents = document.querySelector('#contents');

    function showLogin() {
      dom.empty(contents);
      dom.append(contents, controls);
    }

    events.on('flow:login', showLogin);
    events.on('flow:login:error', function (err) {
      message.persist.error(err);
      showLogin();
    });

    return function destroy() {};
  });
}(window.registerModule));
