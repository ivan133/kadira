/* eslint-disable indent */
export function haveAsyncCallback(args) {
  const lastArg = args[args.length - 1];
  return (typeof lastArg) === 'function';
}

export class UniqueId {
  constructor(start = 0) {
    this.id = start;
  }

  get() {
    return String(this.id++);
  }
}

export const DefaultUniqueId = new UniqueId();

// Optimized version of apply which tries to call as possible as it can
// Then fall back to apply
// This is because, v8 is very slow to invoke apply.
export function optimizedApply(context, fn, args) {
  const a = args;

  switch (a.length) {
    case 0: return fn.call(context);
    case 1: return fn.call(context, a[0]);
    case 2: return fn.call(context, a[0], a[1]);
    case 3: return fn.call(context, a[0], a[1], a[2]);
    case 4: return fn.call(context, a[0], a[1], a[2], a[3]);
    case 5: return fn.call(context, a[0], a[1], a[2], a[3], a[4]);
    default: return fn.apply(context, a);
  }
}
