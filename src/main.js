'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap, uniq } = require('lodash');

exports.detectSchema = object => fromPairs(detect(object));

const detect = (object) =>
  flatMap(toPairs(object), ([key, value]) => {
    const type = getFieldType(value);
    if (Array.isArray(value)) {
      const typesInArray = uniq(value.map(getFieldType));
      if (value.length === 0) {
        return [[key, 'array']]
      } else if (typesInArray.length === 1) {
        const itemType = typesInArray[0];
        if (itemType === 'object') {
          const subSchema = detect(value[0]).map(([path, type]) => [`${key}[].${path}`, type]);
          return [[key, 'array'], [`${key}[]`, typesInArray[0]], ...subSchema];
        }
        return [[key, 'array'], [`${key}[]`, typesInArray[0]]]
      } else {
        return [[key, 'array'], [`${key}[]`, 'mixed']];
      }
    } else if (type === 'object') {
      const subSchema = detect(value).map(([path, type]) => [`${key}.${path}`, type]);
      return [[key, 'object'], ...subSchema];
    }
    return [[key, type]];
  });

const getFieldType = value => {
  const type = typeof value;
  if (['number', 'boolean'].includes(type)) return type;
  if (type === 'string' && isISODate(value)) return 'date';
  return type;
};

const isISODate = value => isValid(parseISO(value));
