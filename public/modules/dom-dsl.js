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
    }, document.createDocumentFragment());
  }

  function append(parent, children) {
    parent.appendChild(childrenFragment(children));
    return parent;
  }

  function empty(parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }

    return parent;
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
        append(el, opts.children);
      }

      if (opts.onClick) {
        el.addEventListener('click', opts.onClick);
      }

      return el;
    }

    context.dom = {
      text: text,
      elem: elem,
      append: append,
      empty: empty
    };

    return function destroy() {};
  });
}(window.registerModule));
