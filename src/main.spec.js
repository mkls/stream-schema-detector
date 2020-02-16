'use strict';

const { detectSchema } = require('./main');

describe('detectSchema', () => {
  it('should return the schema a of a one level deep object', () => {
    const schema = detectSchema({
      a: 23,
      b: 'feji',
      c: true
    });
    expect(schema).toEqual({
      a: 'number',
      b: 'string',
      c: 'boolean'
    });
  });

  it('should detect date type if it is in ISO 8601 format', () => {
    const schema = detectSchema({ a: '2020-02-16T06:13:39.977Z' });
    expect(schema).toEqual({ a: 'date' });
  });

  it('should return schema for nested object', () => {
    const schema = detectSchema({
      a: {
        b: 'hat'
      }
    });
    expect(schema).toEqual({
      'a': 'object',
      'a.b': 'string'
    });
  });

  it('should return schema for objects nested multiple levels', () => {
    const schema = detectSchema({
      a: {
        b: 1,
        c: {
          d: 'tiz',
          e: {}
        }
      }
    });
    expect(schema).toEqual({
      a: 'object',
      'a.b': 'number',
      'a.c': 'object',
      'a.c.d': 'string',
      'a.c.e': 'object'
    })
  });

  it('should detect empty array', () => {
    const schema = detectSchema({ a: [] });
    expect(schema).toEqual({ a: 'array' });
  });

  it('should detect array of numbers, string, objects, etc', () => {
    const schema = detectSchema({
      a: [12, 3],
      b: ['hap', 'lap'],
      c: [{}]
    });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'number',
      'b': 'array',
      'b[]': 'string',
      'c': 'array',
      'c[]': 'object'
    });
  });

  it('should detect mixed array', () => {
    const schema = detectSchema({ a: [1, 'hap'] });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'mixed'
    });
  });

  it('should detect schema of object inside arrays', () => {
    const schema = detectSchema({
      a: [
        { b: 12, c: 't' }
      ]
    });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'object',
      'a[].b': 'number',
      'a[].c': 'string'
    });
  });
});
