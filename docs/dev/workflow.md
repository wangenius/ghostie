---
title: Workflow Development
order: 4
---

# Workflow

## What is a Workflow

Workflow is an important component in Ghostie, used to implement complex processes.

## Development

### References

All interface references use <span v-pre>`{{inputs.NODE_ID.result}}`</span> for referencing. This reference method can be used anywhere input strings are required (including code nodes).

```plaintext
{{inputs.XXXXX.result.data.name}}
// Reference the name property in the data property of the XXXXX node's result parameter
// XXXXX is the ID of the node
// result is the output endpoint of the node
```

1. inputs indicates that the reference comes from an input endpoint
2. The second position represents the ID of a node connecting to the input port
3. The third position represents the nested property name of the JSON object in the node's outputs. The root is usually result, if it can't be retrieved, you can use a panel node to view it.

### Code Node

Code nodes use JavaScript for writing.
Code reference:

```js
// You can write code in a workflow node like this:
const sum = inputs.start.query.number1 + inputs.xxxxx.result.number2;
console.log("Calculation result:", sum);
return sum;
```

1. Use inputs directly in the code to get data from the input endpoints
2. Support for using console.log to output logs
3. Finally, you must call return to return the result.

### Other Nodes

Other nodes, such as: chat, agent, plugin, branch, iterator, code, panel, etc., all directly use data from input endpoints.

For nodes like agent, plugin, chat, etc., the input is generally wrapped with result. So you need to use <span v-pre>`{{inputs.NODE_ID.result}}`</span> to reference it.

If you're not sure, you can use a panel node to view the output endpoint data of a certain node.
