/* jshint browser: true */

(function (register) {
  var NAME = 'render-controls';

  register(NAME, function () {
    var context = this;
    var dom = context.dom;
    var message = context.message;
    var renderMustache = context.renderMustache;
    var events = context.events;

    var flow = document.querySelector('#flow');
    var controls = flow.querySelector('.controls');

    function onClick(opts) {
      return function onClickHandler(ev) {
        events.emit('create-render', opts);
      };
    }

    function yearRange(year) {
      // for simplicity, we'll assume that the user posted
      // in the same timezone that they are using this
      // app from
      return onClick({
        min: (new Date(renderMustache('${year}-01-01T00:00:00', { year: year }))).getTime(),
        max: (new Date(renderMustache('${year}-01-01T00:00:00', { year: year + 1 }))).getTime()
      });
    }

    function dayRange(days) {
      return onClick({
        min: Date.now() - (846e5 * days),
        max: Date.now()
      });
    }

    var instruction = dom.elem('div', { text: 'Get best posts for:'});
    var buttonClass = 'get-images';

    var days30 = dom.elem('button', {
      text: 'last 30 days',
      className: buttonClass,
      onClick: dayRange(30)
    });

    var year2018 = dom.elem('button', {
      text: '2018',
      className: buttonClass,
      onClick: yearRange(2018)
    });

    var year2017 = dom.elem('button', {
      text: '2017',
      className: buttonClass,
      onClick: yearRange(2017)
    });

    var allTime = dom.elem('button', {
      text: 'all time best',
      className: buttonClass,
      onClick: onClick({})
    });

    events.on('flow:render', function () {
      dom.empty(controls);
      dom.append(controls, [
        instruction,
        days30,
        year2018,
        year2017,
        allTime
      ]);
    });

    return function destroy() {};
  });
}(window.registerModule));
