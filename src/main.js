'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap, uniq } = require('lodash');

exports.detectSchema = object => fromPairs(detectObjectSchema(object));

const detectObjectSchema = object =>
  flatMap(toPairs(object), ([key, value]) => {
    const type = getFieldType(value);
    return [[key, type], ...detectSchemaOfItems(type, [value], key)];
  });

const detectSchemaOfItems = (type, items, prefix = '') => {
  if (type === 'object') {
    const schemas = items.map(detectObjectSchema);
    return calculateCommonSchema(schemas).map(prefixPath(`${prefix}.`));
  }
  if (type === 'array') {
    const schemas = items.map(detectArraySchema);
    return calculateCommonSchema(schemas).map(prefixPath(`${prefix}[]`));
  }
  return [];
};

const detectArraySchema = array => {
  const itemTypes = uniq(array.map(getFieldType));

  if (itemTypes.length === 0) return [];
  if (itemTypes.length > 1) return [['', 'mixed']];

  const itemType = itemTypes[0];
  return [['', itemType], ...detectSchemaOfItems(itemType, array)];
};

const calculateCommonSchema = schemas => {
  if (schemas.length === 1) return schemas[0];

  return toPairs(
    schemas.reduce((commonSchema, schemaDef) => {
      schemaDef.forEach(([path, type]) => {
        const previousType = commonSchema[path];
        if (type === previousType) return;
        if (!previousType) {
          commonSchema[path] = type;
        } else {
          commonSchema[path] = 'mixed';
        }
      });
      return commonSchema;
    }, {})
  );
};

const getFieldType = value => {
  const type = typeof value;
  if (type === 'string' && isISODate(value)) return 'date';
  if (Array.isArray(value)) return 'array';
  return type;
};

const prefixPath = prefix => ([path, value]) => [`${prefix}${path}`, value];

const isISODate = value => isValid(parseISO(value));
