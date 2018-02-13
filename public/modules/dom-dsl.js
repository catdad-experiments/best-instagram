/* jshint browser: true, devel: true */

(function (register) {
  var NAME = 'dom-dsl';

  function ensureArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [arr];
  }

  function ensureObject(obj) {
    return (obj === Object(obj)) ? obj : {};
  }

  function text(str) {
    return document.createTextNode(String(str));
  }

  function childrenFragment(children) {
    return ensureArray(children).reduce(function (fragment, child) {
      fragment.appendChild(child);
      return fragment;
    }, document.createDocumentFragment);
  }

  register(NAME, function () {
    var context = this;


    function elem(type, options){
      var opts = ensureObject(options);
      var el = document.createElement(type);

      if (opts.className) {
        el.className = opts.className;
      }

      if (opts.text !== undefined) {
        el.appendChild(text(opts.text));
      }

      if (opts.children) {
        el.appendChild(childrenFragment(opts.children));
      }
    }

    context.dom = {
      elem: elem
    };

    return function destroy() {};
  });
}(window.registerModule));
