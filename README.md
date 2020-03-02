# stream-schema-detector

Detect of schema of event streams.

## detectSchema(object)

Can detect of the schame of a single object:

```js
const { detectSchema } = require('./main');

const schema = detechSchema({ a: 23, b: { c: true, d: [12] } });

// schema is:
{
  'a': 'number',
  'b': 'object',
  'b.c': 'boolean',
  'b.d': 'array',
  'b.d[]': 'number'
}
```

## createStreamSchemaDetector({ loadScheam, saveSchema })

Create a `detector(typeParam, object)` function which will detect the schema of
multiple events by type and update them when detection differs from stored
version.

```js
const { createStreamSchemaDetector } = require('./main');

const schemaStore = {};
const loadSchema = async typeId => schemaStore[typeId];
const saveSchema = async (typeId, schema) => {
  schemaStore[typeId] = schema)
};

const detect = createStreamSchemaDetector({ loadSchema, saveSchema });

await detect('browse_events', { a: 4, b: 'hat' });
await detect('browse_events', { a: 23, b: true, c: 14 });
await detect('purchase', { x: 2 });

// content of schemaStore:
{
  'browse_events': { a: 'number', b: 'mixed', c: 'number' },
  'purcahse': { x: 'number' }
}
```

The returned `detect` function has two parameters: `typeParam` and the object we
want to inspect.
For `typeParam` a complex object can also be passed in, this
will be passed on to `loadSchema` and `storeSchema` as the first parameter.

Will keep cached version of schemas seen so far in memory, only calls `loadSchema` when the
first time it sees the schema and when a conflicting schema was detected on stream, to see
if it was updated in store since the last version in memory.

If the newly detected still differs from the one in store, it will call `saveSchema` to
save a new version.

### Using object as `typeParam`

```js
const schemaStore = {};
const loadSchema = async ({ source, type }) => schemaStore[`${source}_${type}`];
const saveSchema = async ({ source, type }, schema) => {
  schemaStore[`${source}_${type}`] = schema)
};

const detect = createStreamSchemaDetector({ loadSchema, saveSchema });

await detect({ source: 'A', type: 'x' }, { a: 4});

// schemaStore:
{ 'A_x': { a: 'number' } }
```
