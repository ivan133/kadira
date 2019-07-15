import { Ntp } from '../../lib/common/ntp';

Tinytest.add(
  'Ntp - ._now - with correct Date.now',
  function (test) {
    const now = Ntp._now();
    test.equal(now > 0, true);
    test.equal(typeof now, 'number');
  }
);

Tinytest.add(
  'Ntp - ._now - with Date.now as Date object',
  function (test) {
    const oldDateNow = Date.now;
    Date.now = function () {
      return new Date();
    };

    test.equal(typeof Date.now().getTime(), 'number');
    const now = Ntp._now();
    test.equal(now > 0, true);
    test.equal(typeof now, 'number');

    Date.now = oldDateNow;
  }
);
