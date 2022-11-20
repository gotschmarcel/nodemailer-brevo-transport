"use strict";

exports.isArray = function (arr) {
    return arr instanceof Array;
};

exports.isObject = function (obj) {
    return !exports.isUndefined(obj) && obj.constructor === Object;
};

exports.isEmptyObject = function (obj) {
    return exports.isObject(obj) && Object.keys(obj).length === 0;
};

exports.isEmptyString = function (str) {
    return exports.isString(str) && str.length === 0;
};

exports.isUndefined = function (value) {
    return typeof value === "undefined";
};

exports.isString = function (value) {
    return typeof value === "string" || value instanceof String;
};
