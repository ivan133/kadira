export class BaseErrorModel {
  constructor() {
    this._filters = [];
  }

  addFilter(filter) {
    if (typeof filter === 'function') {
      this._filters.push(filter);
    } else {
      throw new Error('Error filter must be a function');
    }
  }

  removeFilter(filter) {
    const index = this._filters.indexOf(filter);
    if (index >= 0) {
      this._filters.splice(index, 1);
    }
  }

  applyFilters(type, message, error, subType) {
    for (let lc = 0; lc < this._filters.length; lc++) {
      const filter = this._filters[lc];

      try {
        const validated = filter(type, message, error, subType);
        if (!validated) return false;
      } catch (ex) {
        // we need to remove this filter
        // we may ended up in a error cycle
        this._filters.splice(lc, 1);
        throw new Error("an error thrown from a filter you've suplied", ex.message);
      }
    }

    return true;
  }
}

