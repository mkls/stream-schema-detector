'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap, uniq } = require('lodash');

exports.detectSchema = object => fromPairs(detect(object));

const detect = object =>
  flatMap(toPairs(object), ([key, value]) => {
    const type = getFieldType(value);
    return [[key, type], ...getNestedSchemas(type, value, key)];
  });

const getNestedSchemas = (type, value, prefix) => {
  if (type === 'object') {
    return detect(value).map(prefixPath(`${prefix}.`));
  }
  if (type === 'array') {
    return detectArraySchema(value).map(prefixPath(`${prefix}[]`));
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

const detectSchemaOfItems = (type, items) => {
  if (type === 'object') {
    const schemas = items.map(detect);
    return toPairs(calculateCommonSchema(schemas)).map(prefixPath('.'));
  }
  if (type === 'array') {
    const schemas = items.map(detectArraySchema);
    return toPairs(calculateCommonSchema(schemas)).map(prefixPath('[]'))
  }
  return [];
};

const calculateCommonSchema = schemas => {
  return schemas.reduce((commonSchema, schemaDef) => {
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
  }, {});
};

const getFieldType = value => {
  const type = typeof value;
  if (type === 'string' && isISODate(value)) return 'date';
  if (Array.isArray(value)) return 'array';
  return type;
};

const prefixPath = prefix => ([path, value]) => [`${prefix}${path}`, value];

const isISODate = value => isValid(parseISO(value));
