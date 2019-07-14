import { Meteor } from 'meteor/meteor';
import { Minimongo, LocalCollection } from 'meteor/minimongo';

// expose for testing purpose
export class OplogCheck {
  static env() {
    if (!process.env.MONGO_OPLOG_URL) {
      return {
        code: 'NO_ENV',
        reason: "You haven't added oplog support for your the Meteor app.",
        solution: 'Add oplog support for your Meteor app. see: http://goo.gl/Co1jJc'
      };
    }

    return true;
  }

  static disableOplog(cursorDescription) {
    if (cursorDescription.options._disableOplog) {
      return {
        code: 'DISABLE_OPLOG',
        reason: "You've disable oplog for this cursor explicitly with _disableOplog option."
      };
    }

    return true;
  }

  // when creating Minimongo.Matcher object, if that's throws an exception
  // meteor won't do the oplog support
  static miniMongoMatcher(cursorDescription) {
    if (Minimongo.Matcher) {
      try {
        // eslint-disable-next-line no-unused-vars
        const matcher = new Minimongo.Matcher(cursorDescription.selector);
        return true;
      } catch (ex) {
        return {
          code: 'MINIMONGO_MATCHER_ERROR',
          reason: "There's something wrong in your mongo query: " + ex.message,
          solution: 'Check your selector and change it accordingly.'
        };
      }
    } else {
      // If there is no Minimongo.Matcher, we don't need to check this
      return true;
    }
  }

  static miniMongoSorter(cursorDescription) {
    const matcher = new Minimongo.Matcher(cursorDescription.selector);

    if (Minimongo.Sorter && cursorDescription.options.sort) {
      try {
        // eslint-disable-next-line no-unused-vars
        const sorter = new Minimongo.Sorter(
          cursorDescription.options.sort,
          { matcher: matcher }
        );
        return true;
      } catch (ex) {
        return {
          code: 'MINIMONGO_SORTER_ERROR',
          reason: 'Some of your sort specifiers are not supported: ' + ex.message,
          solution: 'Check your sort specifiers and chage them accordingly.'
        };
      }
    } else {
      return true;
    }
  }

  static fields(cursorDescription) {
    const options = cursorDescription.options;

    if (options.fields) {
      try {
        LocalCollection._checkSupportedProjection(options.fields);
        return true;
      } catch (e) {
        if (e.name === 'MinimongoError') {
          return {
            code: 'NOT_SUPPORTED_FIELDS',
            reason: 'Some of the field filters are not supported: ' + e.message,
            solution: 'Try removing those field filters.'
          };
        }
        throw e;
      }
    }

    return true;
  }

  static skip(cursorDescription) {
    if (cursorDescription.options.skip) {
      return {
        code: 'SKIP_NOT_SUPPORTED',
        reason: 'Skip does not support with oplog.',
        solution: 'Try to avoid using skip. Use range queries instead: http://goo.gl/b522Av'
      };
    }

    return true;
  }

  static where(cursorDescription) {
    const matcher = new Minimongo.Matcher(cursorDescription.selector);
    if (matcher.hasWhere()) {
      return {
        code: 'WHERE_NOT_SUPPORTED',
        reason: 'Meteor does not support queries with $where.',
        solution: 'Try to remove $where from your query. Use some alternative.'
      };
    }

    return true;
  }

  static geo(cursorDescription) {
    const matcher = new Minimongo.Matcher(cursorDescription.selector);

    if (matcher.hasGeoQuery()) {
      return {
        code: 'GEO_NOT_SUPPORTED',
        reason: 'Meteor does not support queries with geo partial operators.',
        solution: 'Try to remove geo partial operators from your query if possible.'
      };
    }

    return true;
  }

  static limitButNoSort(cursorDescription) {
    const options = cursorDescription.options;

    if ((options.limit && !options.sort)) {
      return {
        code: 'LIMIT_NO_SORT',
        reason: 'Meteor oplog implementation does not support limit without a sort specifier.',
        solution: 'Try adding a sort specifier.'
      };
    }

    return true;
  }

  static gitCheckout() {
    if (!Meteor.release) {
      return {
        code: 'GIT_CHECKOUT',
        reason: "Seems like your Meteor version is based on a Git checkout and it doesn't have the oplog support.",
        solution: 'Try to upgrade your Meteor version.'
      };
    }
    return true;
  }
}

const preRunningMatchers = [
  OplogCheck.env,
  OplogCheck.disableOplog,
  OplogCheck.miniMongoMatcher
];

const globalMatchers = [
  OplogCheck.fields,
  OplogCheck.skip,
  OplogCheck.where,
  OplogCheck.geo,
  OplogCheck.limitButNoSort,
  OplogCheck.miniMongoSorter,
  OplogCheck.gitCheckout
];

Kadira.checkWhyNoOplog = function (cursorDescription, observerDriver) {
  if (typeof Minimongo === 'undefined') {
    return {
      code: 'CANNOT_DETECT',
      reason: "You are running an older Meteor version and Kadira can't check oplog state.",
      solution: 'Try updating your Meteor app'
    };
  }

  let result = runMatchers(preRunningMatchers, cursorDescription, observerDriver);
  if (result !== true) {
    return result;
  }

  result = runMatchers(globalMatchers, cursorDescription, observerDriver);
  if (result !== true) {
    return result;
  }

  return {
    code: 'OPLOG_SUPPORTED',
    reason: "This query should support oplog. It's weird if it's not.",
    solution: "Please contact Kadira support and let's discuss."
  };
};

function runMatchers(matcherList, cursorDescription, observerDriver) {
  for (let lc = 0; lc < matcherList.length; lc++) {
    const matcher = matcherList[lc];
    const matched = matcher(cursorDescription, observerDriver);
    if (matched !== true) {
      return matched;
    }
  }

  return true;
}
