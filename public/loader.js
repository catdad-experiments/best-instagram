/* jshint browser: true, -W069 */
/* global Promise */

window.addEventListener('load', function () {

  var message = (function () {
    var messageDiv = document.querySelector('#message');
    var hideTimeout;

    function cancelTimeout() {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }

    function clear() {
      cancelTimeout();
      messageDiv.classList.remove('show');
    }

    function autoClear(time) {
      cancelTimeout();
      hideTimeout = setTimeout(clear, time || 4000);
    }

    function show(str, isError) {
      if (isError) {
        messageDiv.classList.add('error');
      } else {
        messageDiv.classList.remove('error');
      }

      messageDiv.innerHTML = '';
      messageDiv.appendChild(document.createTextNode(str));

      messageDiv.classList.add('show');

      autoClear();
    }

    return {
      info: function (msg) {
        show(String(msg), false);
      },
      error: function (err) {
        show(String(err), true);
      }
    };
  }());

  function onMissingFeatures(missing) {
    message.error(
      'It seems your browser is not supported. The following features are missing:',
      missing);
  }

  function onError(err) {
    /* jshint -W117 */
    console.error(err);
    /* jshint +W117 */

    message.error(
      'An error occured:',
      err.message || err
    );
  }

  // detect missing features in the browser
  var missingFeatures = [
    'Promise', 'HTMLCanvasElement'
  ].filter(function (name) {
    return !name.split('.').reduce(function (obj, path) {
      return (obj || {})[path];
    }, window);
  });

  if (missingFeatures.length) {
    return onMissingFeatures(missingFeatures.join(', '));
  }

  // ------------------------------------------------
  // we've validated modules... we can use fancy
  // things now
  // ------------------------------------------------

  // some utils, for now
  function renderMustache(str, obj) {
    return Object.keys(obj).reduce(function (memo, key) {
      var value = obj[key];
      var regex = new RegExp('\\$\\{' + key + '\\}', 'g');

      return memo.replace(regex, value);
    }, str);
  }

  // super simple module loader, because I don't want to
  // deal with build for this demo
  function loadScript(name) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');

      script.onload = function () {
        resolve();
      };

      script.onerror = function (err) {
        reject(new Error(name + ' failed to load'));
      };

      script.src = name;

      document.head.appendChild(script);
    });
  }

  var context = {
    onError: onError,
    message: message,
    renderMustache: renderMustache
  };

  var modules = {};

  window.registerModule = function (name, module) {
    // this module loader is stupid, it can only work with
    // functions...
    modules[name] = module.bind(context);
  };

  // load all the modules from the server directly
  Promise.all([
    loadScript('modules/event-emitter.js'),
    loadScript('modules/dom-dsl.js'),
    loadScript('modules/instagram-api.js'),
    loadScript('modules/login-controls.js'),
    loadScript('modules/render-controls.js'),
    loadScript('modules/render.js'),
  ]).then(function () {
    // set up a global event emitter
    context.events = modules['event-emitter']();

    var domDslDestroy = modules['dom-dsl']();
    var instagramApiDestroy = modules['instagram-api']();
    var loginControlsDestroy = modules['login-controls']();
    var renderControlsDestroy = modules['render-controls']();
    var renderDestroy = modules['render']();

    context.events.on('error', function (err) {
      onError(err);

      domDslDestroy();
      instagramApiDestroy();
      loginControlsDestroy();
      renderControlsDestroy();
      renderDestroy();
    });

    var query = (function parseQuery(queryArr) {
      return queryArr.reduce(function (memo, val) {
        if (!val) {
          return memo;
        }

        var q = val.split('=');
        memo[q.shift()] = q.join('=');
        return memo;
      }, {});
    }(window.location.search.substring(1).split('&')));

    if (query.error) {
      context.events.emit('flow:login');
      message.error('There was a problem loggin in. Please try again.');
    } else if (window.TOKEN) {
      context.events.emit('flow:render');
    } else {
      context.events.emit('flow:login');
    }
  }).catch(function (err) {
    context.events.emit('error', err);
    onError(err);
  });
});
