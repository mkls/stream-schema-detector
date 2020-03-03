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

Create a `detect` function which will detect the schema of multiple events by type
and update them when detected schema differs from stored version.

- `loadSchema(typeParam)`:

  called when no cached schema is found for given typeParam, should return a saved schema.
  `typeParam` could be any json strigifiable value.

- `saveSchema(typeParam, schema, exampleItem)`:

  called when the detected schema differs from one returned by `loadSchema`.

- `detect(typeParam, item)`:

  the returned function, can be called with a `typeParam` and an item we want to inspect.

  Will call `loadSchema` for the given typeParam and compare its return value with
  the detected schema of the item. Calls `saveSchema` if detected schema differs from
  saved one.

  The result of `loadSchema` is cached in memory, it will only be called once for
  each `typeParam` until no differences are detected.


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
