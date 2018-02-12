/* jshint browser: true */

(function (register) {
  var NAME = 'render-controls';

  register(NAME, function () {
    var context = this;
    var message = context.message;
    var renderMustache = context.renderMustache;
    var events = context.events;

    var quickRangeButtons = document.querySelectorAll('.get-images');

    [].forEach.call(quickRangeButtons, function (button) {
      var year = button.getAttribute('data-year');
      var days = button.getAttribute('data-days');
      var minDate, maxDate;

      // convert to a number
      if (year) {
        year = Number(year);
      }

      // use the year to generate date range
      if (year) {
        // for simplicity, we'll assume that the user posted
        // in the same timezone that they are using this
        // app from
        minDate = (new Date(renderMustache('${year}-01-01T00:00:00', { year: year }))).getTime();
        maxDate = (new Date(renderMustache('${year}-01-01T00:00:00', { year: year + 1 }))).getTime();
      }

      if (days) {
        days = Number(days);
      }

      if (days) {
        minDate = Date.now() - (846e5 * days);
        maxDate = Date.now();
      }

      button.onclick = function () {
        events.emit('create-render', {
          min: minDate,
          max: maxDate
        });
      };
    });

    return function destroy() {};
  });
}(window.registerModule));
