'use strict';

const { toPairs } = require('lodash');
const detectSchema = require('./detect-schema');
const calculateCommonSchema = require('./calculate-common-schema');

module.exports = ({ saveSchema = async () => {}, loadSchema = async () => {} }) => {
  const schemaCache = {};

  const getCacheKey = typeParam => JSON.stringify(typeParam);
  const updateCache = (typeParam, schema) => (schemaCache[getCacheKey(typeParam)] = schema);
  const getSchemaFromCache = typeParam => schemaCache[getCacheKey(typeParam)];
  const getSchemaFromStore = async typeParam => {
    const schema = (await loadSchema(typeParam)) || {};
    updateCache(typeParam, schema);
    return schema;
  };

  return async (typeParam, eventData) => {
    const schema = detectSchema(eventData);

    const cachedSchema = getSchemaFromCache(typeParam);
    if (cachedSchema && isMoreSpecificVersion(cachedSchema, schema)) return;

    const savedSchema = await getSchemaFromStore(typeParam);
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
