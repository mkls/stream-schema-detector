'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap } = require('lodash');
const calculateCommonSchema = require('./calculate-common-schema');

module.exports = object => fromPairs(detect(object).slice(1));

const detect = item => {
  const type = getItemType(item);
  return [
    ['', [type]],
    ...(type === 'object' ? detectObject(item) : []),
    ...(type === 'array' ? detectArray(item) : [])
  ].map(([path, type]) => [path.replace(/\.\[\]/g, '[]'), type]);
};

const getItemType = value => {
  const type = typeof value;
  if (type === 'string' && isISODate(value)) return 'date';
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return type;
};

const isISODate = value => isValid(parseISO(value));

const detectObject = object =>
  flatMap(
    toPairs(object).map(([path, value]) =>
      detect(value).map(([subPath, type]) => [subPath ? `${path}.${subPath}` : path, type])
    )
  );

const detectArray = items => {
  const commonSchemaOfItems = toPairs(calculateCommonSchema(items.map(detect)));
  return commonSchemaOfItems.map(([subPath, type]) => [subPath ? `[].${subPath}` : '[]', type]);
};
