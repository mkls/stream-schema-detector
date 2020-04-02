'use strict';

module.exports = schemas =>
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
