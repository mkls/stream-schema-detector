'use strict';

const createStreamSchemaDetector = require('./create-stream-schema-detector');

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

    expect(saveSchema).toBeCalledWith(
      { eventId: 13 },
      { a: ['array'], 'a[]': ['number'] },
      { a: [23, 3] }
    );
  });

  it('should not save schema if detected schema does not differ from loaded one', async () => {
    schemaStore['event-A'] = { a: ['number'] };

    await detect('event-A', { a: 14 });

    expect(saveSchema).not.toBeCalled();
  });

  it('should cache schemas in memory and not load again for the same params', async () => {
    schemaStore['event-A'] = { a: ['boolean'] };

    await detect('event-A', { a: true });
    await detect('event-A', { a: false });

    expect(loadSchema).toBeCalledTimes(1);
  });

  it('should load schema again before saving to avoid updates based on outdated cache', async () => {
    schemaStore['eventA'] = { a: ['number'] };

    await detect('eventA', { a: 14 });
    schemaStore['eventA'] = { a: ['number', 'boolean'] };
    await detect('eventA', { a: true });

    expect(saveSchema).not.toBeCalled();
  });

  it('should generalize schema with information from new events', async () => {
    await detect('A', { a: 12 });
    await detect('A', { b: true });

    expect(await loadSchema('A')).toEqual({ a: ['number'], b: ['boolean'] });
  });

  it('should not save new schema if saved schema only differs by being more general', async () => {
    schemaStore['eventA'] = { a: ['number', 'boolean'], b: ['number'] };

    await detect('eventA', { a: true, b: 3 });

    expect(saveSchema).not.toBeCalled();
  });

  it('should not save new schema if there are less fields in newly detected schema', async () => {
    schemaStore['eventA'] = { a: ['number'], b: ['boolean'] };

    await detect('eventA', { b: true });

    expect(saveSchema).not.toBeCalled();
  });

  it('should not load schema again if it was just updated by the current process', async () => {
    schemaStore['event-A'] = {};

    await detect('event-A', { a: 14 });
    await detect('event-A', { a: 34 });

    expect(loadSchema).toHaveBeenCalledTimes(2);
  });
});
