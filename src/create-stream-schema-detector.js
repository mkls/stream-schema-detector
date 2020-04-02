'use strict';

const { toPairs } = require('lodash');
const detectSchema = require('./detect-schema');
const calculateCommonSchema = require('./calculate-common-schema');

module.exports = ({ saveSchema = async () => {}, loadSchema = async () => {} }) => {
  const schemaCache = {};

  const getCacheKey = typeParam => JSON.stringify(typeParam);
  const updateCache = (typeParam, schema) => schemaCache[getCacheKey(typeParam)] = schema;

  const getSchema = async (typeParam, forceRefresh = false) => {
    const key = getCacheKey(typeParam);
    if (!schemaCache[key] || forceRefresh) {
      schemaCache[key] = await loadSchema(typeParam);
    }
    return schemaCache[key] || {};
  };

  return async (typeParam, eventData) => {
    const schema = detectSchema(eventData);

    const cachedSchema = await getSchema(typeParam);
    if (isMoreSpecificVersion(cachedSchema, schema)) return;
    const savedSchema = await getSchema(typeParam, true);

    if (!isMoreSpecificVersion(savedSchema, schema)) {
      const updatedSchema = calculateCommonSchema([toPairs(savedSchema), toPairs(schema)]);
      updateCache(typeParam, updatedSchema);
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
