import { HTTP } from 'meteor/http';

export function httpRequest(method, url, options, callback) {
  HTTP.call(method, url, options, callback);
}
