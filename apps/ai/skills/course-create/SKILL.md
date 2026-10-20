# Course create

Every map is built by the Map Creation Protocol: [`docs/protocol/map-creation.md`](../../../../docs/protocol/map-creation.md).

Load the prompts in this order and fill the `{{...}}` values from the server-built context packet:

1. [`packages/protocol/prompts/shared-rules.md`](../../../../packages/protocol/prompts/shared-rules.md), always.
2. [`packages/protocol/prompts/unit-builder.md`](../../../../packages/protocol/prompts/unit-builder.md) for the course, module and lesson levels, or
   [`packages/protocol/prompts/content-item-builder.md`](../../../../packages/protocol/prompts/content-item-builder.md) for one content item.

There are no size targets. Cover what the learner's goal needs, then stop. The server refuses out-of-order calls; call `map.status` when unsure.
