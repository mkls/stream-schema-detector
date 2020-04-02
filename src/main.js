'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap } = require('lodash');

exports.detectSchema = object => fromPairs(detect(object).slice(1));

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

const calculateCommonSchema = schemas =>
  schemas.reduce((commonSchema, schemaDef) => {
    schemaDef.forEach(([path, types]) => {
      const previousTypes = commonSchema[path];
      if (!previousTypes) {
        commonSchema[path] = types;
      } else if (types.some(type => previousTypes.includes(type))) {
        return;
      } else {
        commonSchema[path] = [...previousTypes, ...types];
      }
    });
    return commonSchema;
  }, {});

exports.createStreamSchemaDetector = ({
  saveSchema = async () => {},
  loadSchema = async () => {}
}) => {
  const schemaCache = {};

  const getSchema = async (typeParam, forceRefresh = false) => {
    const key = JSON.stringify(typeParam);
    if (!schemaCache[key] || forceRefresh) {
      schemaCache[key] = await loadSchema(typeParam);
    }
    return schemaCache[key] || {};
  };

  return async (typeParam, eventData) => {
    const schema = exports.detectSchema(eventData);

    const cacheSchema = await getSchema(typeParam);
    if (isMoreSpecificVersion(cacheSchema, schema)) return;
    const savedSchema = await getSchema(typeParam, true);

    if (!isMoreSpecificVersion(savedSchema, schema)) {
      const updatedSchema = calculateCommonSchema([toPairs(savedSchema), toPairs(schema)]);
      await saveSchema(typeParam, updatedSchema, eventData);
    }
  };
};

const isMoreSpecificVersion = (genericSchema, specificSchema) => {
  return toPairs(specificSchema).reduce((isMatchingSoFar, [path, types]) => {
    if (!isMatchingSoFar) return false;
    const genericTypesForPath = genericSchema[path];
    if (!genericTypesForPath) return false;
    return types.every(type => genericTypesForPath.includes(type));
  }, true);
};
