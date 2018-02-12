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
      info: show,
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
    message: message
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
  ]).then(function () {
    // set up a global event emitter
    context.events = modules['event-emitter']();

    context.events.on('error', function (err) {
      onError(err);
    });

    // start the app
    context.events.emit('start-video');
  }).catch(function (err) {
    context.events.emit('error', err);
    onError(err);
  });
});
