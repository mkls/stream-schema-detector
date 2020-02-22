'use strict';

const { detectSchema, createStreamSchemaDetector } = require('./main');

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

  it('should detect array on numbers', () => {
    const schema = detectSchema({
      a: [12, 3]
    });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'number'
    });
  });

  it('should detect array of string, objects, etc', () => {
    const schema = detectSchema({
      b: ['hap', 'lap'],
      c: [{}],
      d: [[]]
    });
    expect(schema).toEqual({
      'b': 'array',
      'b[]': 'string',
      'c': 'array',
      'c[]': 'object',
      'd': 'array',
      'd[]': 'array'
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

  it('should detect the broadest possible schema when objects in array differ', () => {
    const schema = detectSchema({
      a: [
        { b: 1, c: 'hat' },
        { d: true },
        { b: 'nyoc' }
      ]
    });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'object',
      'a[].b': 'mixed',
      'a[].c': 'string',
      'a[].d': 'boolean'
    });
  });

  it('should detect common schema for array of arrays', () => {
    const schema = detectSchema({
      a: [[1,2], [4]]
    });
    expect(schema).toEqual({
      'a': 'array',
      'a[]': 'array',
      'a[][]': 'number'
    });
  });
});

describe('streamSchemaDetector', () => {
  it('should detect schema for a given event type amd save it with passed in callback', async () => {
    const saveSchema = jest.fn();
    const detect = createStreamSchemaDetector({ saveSchema });

    await detect({ eventId: 13 }, { a: [23, 3]});

    expect(saveSchema).toBeCalledWith({ eventId: 13 }, { 'a': 'array', 'a[]': 'number' });
  });

  it('should not save schema if detected schema does not differ from loaded one', async () => {
    const loadSchema = async () => ({ a: 'number' });
    const saveSchema = jest.fn();
    const detect = createStreamSchemaDetector({ loadSchema, saveSchema });

    await detect('event-A', { a: 14 });

    expect(saveSchema).not.toBeCalled();
  });

  it('should cache schemas in memory and not load again for the same params', async () => {
    const loadSchema = jest.fn().mockResolvedValue({ a: 'boolean' });
    const detect = createStreamSchemaDetector({ loadSchema });

    await detect('event-A', { a: true });
    await detect('event-A', { a: false });

    expect(loadSchema).toBeCalledTimes(1);
  });

  it('should load schema again before saving to avoid updates based on outdated cache', async () => {
    const schemaStore = { 'eventA': { a: 'number' }};
    const loadSchema = async id => schemaStore[id];
    const saveSchema = jest.fn();
    const detect = createStreamSchemaDetector({ loadSchema, saveSchema });

    await detect('eventA', { a: 14 });
    schemaStore['eventA'] = { a: 'boolean' };
    await detect('eventA', { a: true });

    expect(saveSchema).not.toBeCalled();
  });
});
