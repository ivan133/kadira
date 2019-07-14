import { Random } from 'meteor/random';
import { optimizedApply } from '../../lib/server/utils';

Tinytest.addAsync(
  'Utils - optimizedApply - calling arguments',
  function (test, done) {
    runWithArgs(0);
    function runWithArgs(argCount) {
      const context = {};
      const args = buildArrayOf(argCount);
      const retValue = Random.id();
      const fn = function () {
        test.equal([...arguments], args);
        test.equal(this, context);
        return retValue;
      };

      const ret = optimizedApply(context, fn, args);
      test.equal(ret, retValue);

      if (argCount > 10) {
        done();
      } else {
        runWithArgs(argCount + 1);
      }
    }
  }
);

function buildArrayOf(length) {
  const arr = [];
  for (let lc = 0; lc < length; lc++) {
    arr.push(Random.id());
  }
  return arr;
}
