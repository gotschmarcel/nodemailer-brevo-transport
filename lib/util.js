"use strict";

exports.isEmptyObject = function (obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
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
