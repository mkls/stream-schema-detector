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
      a: 'object',
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
    });
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
      a: 'array',
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
      b: 'array',
      'b[]': 'string',
      c: 'array',
      'c[]': 'object',
      d: 'array',
      'd[]': 'array'
    });
  });

  it('should detect mixed array', () => {
    const schema = detectSchema({ a: [1, 'hap'] });
    expect(schema).toEqual({
      a: 'array',
      'a[]': 'mixed'
    });
  });

  it('should detect schema of object inside arrays', () => {
    const schema = detectSchema({
      a: [{ b: 12, c: 't' }]
    });
    expect(schema).toEqual({
      a: 'array',
      'a[]': 'object',
      'a[].b': 'number',
      'a[].c': 'string'
    });
  });

  it('should detect the broadest possible schema when objects in array differ', () => {
    const schema = detectSchema({
      a: [{ b: 1, c: 'hat' }, { d: true }, { b: 'nyoc' }]
    });
    expect(schema).toEqual({
      a: 'array',
      'a[]': 'object',
      'a[].b': 'mixed',
      'a[].c': 'string',
      'a[].d': 'boolean'
    });
  });

  it('should detect common schema for array of arrays', () => {
    const schema = detectSchema({
      a: [[1, 2], [4]]
    });
    expect(schema).toEqual({
      a: 'array',
      'a[]': 'array',
      'a[][]': 'number'
    });
  });
});

describe('streamSchemaDetector', () => {
  let loadSchema, saveSchema, detect, schemaStore;

  beforeEach(() => {
    schemaStore = {};
    loadSchema = jest.fn().mockImplementation(async id => schemaStore[id]);
    saveSchema = jest.fn().mockImplementation(async (id, schema) => (schemaStore[id] = schema));
    detect = createStreamSchemaDetector({ loadSchema, saveSchema });
  });

  it('should detect schema for a given event type amd save it with passed in callback', async () => {
    await detect({ eventId: 13 }, { a: [23, 3] });

    expect(saveSchema).toBeCalledWith({ eventId: 13 }, { a: 'array', 'a[]': 'number' });
  });

  it('should not save schema if detected schema does not differ from loaded one', async () => {
    schemaStore['event-A'] = { a: 'number' };

    await detect('event-A', { a: 14 });

    expect(saveSchema).not.toBeCalled();
  });

  it('should cache schemas in memory and not load again for the same params', async () => {
    schemaStore['event-A'] = { a: 'boolean' };

    await detect('event-A', { a: true });
    await detect('event-A', { a: false });

    expect(loadSchema).toBeCalledTimes(1);
  });

  it('should load schema again before saving to avoid updates based on outdated cache', async () => {
    schemaStore['eventA'] = { a: 'number' };

    await detect('eventA', { a: 14 });
    schemaStore['eventA'] = { a: 'mixed' };
    await detect('eventA', { a: true });

    expect(saveSchema).not.toBeCalled();
  });

  it('should generalize schema with information from new events', async () => {
    await detect('A', { a: 12 });
    await detect('A', { b: true });

    expect(await loadSchema('A')).toEqual({ a: 'number', b: 'boolean' });
  });

  it('should not save new schema if saved schema only differs by being more general', async () => {
    schemaStore['eventA'] = { a: 'mixed', b: 'number' };

    await detect('eventA', { a: true, b: 3 });

    expect(saveSchema).not.toBeCalled();
  });

  it('should not save new schema if there are less fields in newly detected schema', async () => {
    schemaStore['eventA'] = { a: 'number', b: 'boolean' };

    await detect('eventA', { b: true });

    expect(saveSchema).not.toBeCalled();
  });
});
