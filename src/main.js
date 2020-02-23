'use strict';

const { parseISO, isValid } = require('date-fns');
const { toPairs, fromPairs, flatMap } = require('lodash');

exports.detectSchema = object => fromPairs(detect(object).slice(1));

const detect = item => {
  const type = getItemType(item);
  return [
    ['', type],
    ...(type === 'object' ? detectObject(item) : []),
    ...(type === 'array' ? detectArray(item) : [])
  ].map(([path, type]) => [path.replace(/\.\[\]/g, '[]'), type]);
};

const getItemType = value => {
  const type = typeof value;
  if (type === 'string' && isISODate(value)) return 'date';
  if (Array.isArray(value)) return 'array';
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

exports.createStreamSchemaDetector = ({
  saveSchema = async () => {},
  loadSchema = async () => {}
}) => {
  const schemaCache = {};

  const getSchema = async (idParams, forceRefresh = false) => {
    const key = JSON.stringify(idParams);
    if (!schemaCache[key] || forceRefresh) {
      schemaCache[key] = await loadSchema(idParams);
    }
    return schemaCache[key] || {};
  };

  return async (idParams, eventData) => {
    const schema = exports.detectSchema(eventData);

    const cacheSchema = await getSchema(idParams);
    if (isMoreSpecificVersion(cacheSchema, schema)) return;
    const savedSchema = await getSchema(idParams, true);

    if (!isMoreSpecificVersion(savedSchema, schema)) {
      const updatedSchema = calculateCommonSchema([toPairs(savedSchema), toPairs(schema)]);
      await saveSchema(idParams, updatedSchema);
    }
  };
};

const isMoreSpecificVersion = (genericSchema, specificSchema) => {
  return toPairs(specificSchema).reduce((isMatchingSoFar, [path, type]) => {
    if (!isMatchingSoFar) return false;
    const genericTypeForPath = genericSchema[path];
    if (!genericTypeForPath) return false;
    return genericTypeForPath === type || genericTypeForPath === 'mixed';
  }, true);
};
