---
title: Plugin Development
order: 3
---

# Plugin Development

> 💡 **Quick Development Tip**: You can use the Ghostie Plugin Development Assistant in the Agent Market to quickly develop plugins. This assistant can help you generate compliant plugin code and provide real-time code suggestions and error checking.

## What is a Plugin

Plugins extend the capabilities of AI assistants.

## How to Develop

1. Use TypeScript
2. Use Deno runtime

## Example

```ts
/**
 * @name Time Management Plugin
 * @description Provides functionality to get current time
 */

// Parameter definition
interface Params {
  // Timezone, optional parameter
  timezone?: string;
}

/**
 * Get current time
 *
 * @param params - Object containing timezone parameter
 * @returns Returns string representation of current time
 */
export async function getCurrentTime(params: Params): Promise<string> {
  return new Date().toString();
}
```

## Plugin Development Guidelines

1. Plugins should be annotated with `@name` and `@description` in documentation comments to specify the plugin name and functionality description.
2. All tool functions intended for external use must be exported using `export`, otherwise they will not be visible.
3. Each tool function should accept only one parameter, with the parameter type unified as `object` (i.e., `Record<string, any>`), and its structure should be clearly defined using `interface`.
4. Each tool function must have usage instructions added using `//` or `/** */` comments, which should clearly describe the function's purpose.
5. Each field in the parameter's `interface` must have a comment using `//` explaining its meaning.
6. Plugins should use Deno's package management method (e.g., `import { xxx } from "https://deno.land/x/..."`).
7. Environment variables should be accessed uniformly through `Deno.env.get()`.

## More Examples

```ts
/**
 * @name Local TXT File Reader Plugin
 * @description Reads content from a specified local TXT file
 */

// Parameter definition
interface Params {
  // File path
  filePath: string; // Complete path including filename and extension
}

/**
 * Read local TXT file content
 *
 * @param params - Object containing file path
 * @returns Returns file content as string
 */
export async function readTxtFile(params: Params): Promise<string> {
  try {
    // Check if parameters are correct
    if (!params.filePath || typeof params.filePath !== "string") {
      throw new Error("Invalid file path, please provide a correct file path.");
    }
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
    let path = `${homeDir}/Desktop/${params.filePath}`;
    // Ensure file exists and read content
    const fileInfo = await Deno.stat(path);
    if (!fileInfo.isFile) {
      throw new Error("The specified path is not a valid file.");
    }

    const fileContent = await Deno.readTextFile(path);
    return fileContent;
  } catch (error) {
    console.error("Error occurred while reading file:", error);
    throw error;
  }
}
```

# Environment Variables

You can set environment variables above the list in the plugin settings page.

In code, call:

```ts
Deno.env.get("GREETING");
```
