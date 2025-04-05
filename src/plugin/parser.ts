import ts from "typescript";
import { FunctionCallProps, ToolProperty } from "./types";

// --- 新的输出结构定义 ---

// 插件的工具信息结构
interface ParsedPluginTools {
  [functionName: string]: FunctionCallProps;
}

// -- 定义最终的输出结构 --
interface PluginOutput {
  meta: Record<string, any>;
  tools: ParsedPluginTools;
}

// --- 类型映射辅助函数 ---

/**
 * 将 TypeScript 类型节点或 JSDoc 类型字符串映射到 JSON Schema 类型。
 * @param typeNode TS 类型节点.
 * @param sourceFile 源文件 AST，用于获取文本.
 * @returns JSON Schema 类型属性对象.
 */
function mapTsTypeToJsonSchemaType(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
): ToolProperty {
  const defaultType: ToolProperty = {
    type: "string",
    description: "未能解析类型，默认为 string",
  }; // 默认值

  if (!typeNode) {
    return defaultType;
  }

  let description: string | undefined = undefined;

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: "string" };
    case ts.SyntaxKind.NumberKeyword:
      return { type: "number" };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: "boolean" };
    case ts.SyntaxKind.ArrayType:
      const arrayTypeNode = typeNode as ts.ArrayTypeNode;
      const elementType = mapTsTypeToJsonSchemaType(
        arrayTypeNode.elementType,
        sourceFile,
      );
      return { type: "array", items: elementType };
    case ts.SyntaxKind.TypeReference:
      const typeRefNode = typeNode as ts.TypeReferenceNode;
      const typeName = typeRefNode.typeName.getText(sourceFile);
      if (
        typeName === "Array" &&
        typeRefNode.typeArguments &&
        typeRefNode.typeArguments.length > 0
      ) {
        const elementArgType = mapTsTypeToJsonSchemaType(
          typeRefNode.typeArguments[0],
          sourceFile,
        );
        return { type: "array", items: elementArgType };
      }
      return { type: "object", description: `类型引用: ${typeName}` };
    case ts.SyntaxKind.TypeLiteral:
      return { type: "object", description: "内联对象类型" };
    case ts.SyntaxKind.UnionType:
      const unionNode = typeNode as ts.UnionTypeNode;
      const typeNames = unionNode.types.map(
        (t) => mapTsTypeToJsonSchemaType(t, sourceFile).type,
      );
      let resolvedType: ToolProperty["type"] = "string";
      if (typeNames.includes("string")) resolvedType = "string";
      else if (typeNames.includes("number")) resolvedType = "number";
      else if (typeNames.includes("boolean")) resolvedType = "boolean";
      else if (typeNames.includes("array")) resolvedType = "array";
      else if (typeNames.includes("object")) resolvedType = "object";
      else if (typeNames.length > 0)
        resolvedType = typeNames[0] as ToolProperty["type"];

      description = `联合类型: ${typeNode.getText(sourceFile)}`;
      return { type: resolvedType, description };
    case ts.SyntaxKind.IntersectionType:
      description = `交叉类型: ${typeNode.getText(sourceFile)}`;
      return { type: "object", description };
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return {
        type: "string",
        description: "类型为 any/unknown,映射为 string",
      };
    case ts.SyntaxKind.VoidKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.NullKeyword:
      return {
        type: "string",
        description: `类型: ${typeNode.getText(sourceFile)}`,
      };
    case ts.SyntaxKind.LiteralType:
      const literalTypeNode = typeNode as ts.LiteralTypeNode;
      if (
        ts.isStringLiteral(literalTypeNode.literal) ||
        ts.isNoSubstitutionTemplateLiteral(literalTypeNode.literal)
      )
        return { type: "string" };
      if (ts.isNumericLiteral(literalTypeNode.literal))
        return { type: "number" };
      if (
        literalTypeNode.literal.kind === ts.SyntaxKind.TrueKeyword ||
        literalTypeNode.literal.kind === ts.SyntaxKind.FalseKeyword
      )
        return { type: "boolean" };
      return {
        type: "string",
        description: `字面量类型: ${typeNode.getText(sourceFile)}`,
      };

    default:
      const fallbackType = typeNode.getText(sourceFile);
      description = `未知或复杂类型，原始文本: ${fallbackType}`;
      if (fallbackType.includes("|") || fallbackType.includes("&"))
        return { type: "string", description };
      if (
        /^[A-Z]/.test(fallbackType) ||
        fallbackType.endsWith("Args") ||
        fallbackType.endsWith("Options")
      )
        return { type: "object", description };

      return { type: "string", description };
  }
}

// --- Helper function to find Interface Declarations ---

/**
 * Finds an interface declaration by name within the SourceFile.
 * @param interfaceName The name of the interface to find.
 * @param sourceFile The TypeScript SourceFile node.
 * @returns The InterfaceDeclaration node or undefined if not found.
 */
function findInterfaceDeclaration(
  interfaceName: string,
  sourceFile: ts.SourceFile,
): ts.InterfaceDeclaration | undefined {
  let foundInterface: ts.InterfaceDeclaration | undefined = undefined;

  function visitNode(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      foundInterface = node;
      return; // Found, stop searching this branch
    }
    if (!foundInterface) {
      // Continue searching if not found
      ts.forEachChild(node, visitNode);
    }
  }

  visitNode(sourceFile);
  return foundInterface;
}

// --- Helper function to parse Interface/TypeLiteral Members ---

/**
 * Parses members of an InterfaceDeclaration or TypeLiteralNode.
 * @param declaration The InterfaceDeclaration or TypeLiteralNode.
 * @param sourceFile The source file for context.
 * @returns An object containing properties and required list.
 */
function parseInterfaceMembers(
  declaration: ts.InterfaceDeclaration | ts.TypeLiteralNode,
  sourceFile: ts.SourceFile,
): {
  properties: { [paramName: string]: ToolProperty };
  required: string[];
} {
  const properties: { [paramName: string]: ToolProperty } = {};
  const required: string[] = [];
  const codeString = sourceFile.getFullText(); // 获取完整代码字符串以便提取注释

  declaration.members.forEach((member) => {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sourceFile);
      const propSchemaType = mapTsTypeToJsonSchemaType(member.type, sourceFile);

      // --- 提取属性描述 ---
      let propDescription = propSchemaType.description || ""; // 默认使用类型推断的描述
      const jsDocComments = ts.getJSDocCommentsAndTags(member);

      // 1. 优先使用 JSDoc 块注释
      if (
        jsDocComments.length > 0 &&
        typeof jsDocComments[0].comment === "string"
      ) {
        const commentText = jsDocComments[0].comment.trim();
        // 避免覆盖有意义的类型推断描述，除非 JSDoc 提供了实质内容
        if (
          commentText &&
          !commentText.startsWith("类型") &&
          !commentText.startsWith("未知")
        ) {
          propDescription = commentText;
        }
        // 2. 如果没有 JSDoc，尝试获取普通注释
      } else {
        const commentRanges = ts.getLeadingCommentRanges(
          codeString,
          member.pos,
        );
        let singleLineComments: string[] = [];
        let multiLineComment: string | undefined = undefined;

        if (commentRanges) {
          commentRanges.forEach((range) => {
            const commentText = codeString.substring(range.pos, range.end);
            if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
              // 移除 // 前缀并去除空白
              singleLineComments.push(
                commentText.replace(/^\/\/\s*/, "").trim(),
              );
            } else if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
              // 移除 /* */ 包裹和内部的 * 前缀，去除空白
              multiLineComment = commentText
                .replace(/^\/\*+\s*|\s*\*+\/$/g, "")
                .replace(/^\s*\*/gm, "")
                .trim();
            }
          });
        }

        // 优先使用多行注释，其次是单行注释
        if (multiLineComment) {
          propDescription = multiLineComment;
        } else if (singleLineComments.length > 0) {
          // (简单处理：将找到的所有单行注释连接起来)
          propDescription = singleLineComments.join("\n"); // 或者用空格连接 join(' ')
        }
      }
      // --- 描述提取结束 ---

      properties[propName] = {
        ...propSchemaType,
        description: propDescription || undefined, // 使用最终确定的描述
      };

      if (!member.questionToken) {
        // Check if the property is optional
        required.push(propName);
      }
    }
  });

  return { properties, required };
}

// --- 主解析函数 ---

/**
 * 解析 TypeScript 代码字符串，提取插件元数据和工具信息。
 * @param codeString 包含 TypeScript 代码的字符串。
 * @returns 解析后的插件信息对象，包含 meta 和 tools。
 */
export function parsePluginFromString(codeString: string): PluginOutput {
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    codeString,
    ts.ScriptTarget.Latest,
    true,
  );

  // 初始化结果对象
  const result: PluginOutput = { meta: {}, tools: {} };
  const toolsInfo: ParsedPluginTools = {};

  // --- 解析开头的 JSDoc 元数据 ---
  const commentRanges = ts.getLeadingCommentRanges(codeString, 0);
  if (commentRanges && commentRanges.length > 0) {
    const firstCommentRange = commentRanges[0];
    // 确保是 MultiLineCommentTrivia 且以 /** 开头
    if (
      firstCommentRange.kind === ts.SyntaxKind.MultiLineCommentTrivia &&
      codeString.substring(firstCommentRange.pos, firstCommentRange.pos + 3) ===
        "/**"
    ) {
      const commentText = codeString.substring(
        firstCommentRange.pos,
        firstCommentRange.end,
      );
      const lines = commentText.split("\n");
      lines.forEach((line) => {
        // 匹配 @key value 格式
        const match = line.match(/^\s*\*\s*@(\w+)\s+(.*)/);
        if (match) {
          const key = match[1];
          const value = match[2].trim();
          // 简单处理，直接赋值
          result.meta[key] = value;
        }
      });
    }
  }
  // --- 元数据解析结束 ---

  function visit(node: ts.Node) {
    // 只处理导出的函数声明
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const functionName = node.name.text;
      let funcDescription = ""; // 函数描述
      const properties: { [paramName: string]: ToolProperty } = {};
      const required: string[] = [];

      // --- 提取 JSDoc 和其他注释 ---
      const jsDocTags = ts.getJSDocTags(node);
      const descriptionTag = jsDocTags.find(
        (tag) => tag.tagName.text === "description",
      );

      if (descriptionTag && typeof descriptionTag.comment === "string") {
        funcDescription = descriptionTag.comment.trim();
      } else {
        // 尝试获取 JSDoc 块注释
        const comments = ts.getJSDocCommentsAndTags(node);
        if (comments.length > 0 && typeof comments[0].comment === "string") {
          funcDescription = comments[0].comment.trim();
        } else {
          // --- 新增逻辑：如果 JSDoc 没有描述，尝试获取普通注释 ---
          const commentRanges = ts.getLeadingCommentRanges(
            codeString,
            node.pos,
          );
          let singleLineComments: string[] = [];
          let multiLineComment: string | undefined = undefined;

          if (commentRanges) {
            commentRanges.forEach((range) => {
              const commentText = codeString.substring(range.pos, range.end);
              if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
                singleLineComments.push(
                  commentText.replace(/^\/\/\s*/, "").trim(),
                );
              } else if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
                // 保留最后一个多行注释
                multiLineComment = commentText
                  .replace(/^\/\*+\s*|\s*\*+\/$/g, "")
                  .replace(/^\s*\*/gm, "")
                  .trim();
              }
            });
          }

          // 优先使用多行注释，其次是连接的单行注释
          if (multiLineComment) {
            funcDescription = multiLineComment;
          } else if (singleLineComments.length > 0) {
            // 只考虑紧邻函数声明上方的连续单行注释块
            // (简单处理：将找到的所有单行注释连接起来)
            funcDescription = singleLineComments.join("\\n"); // 或者用空格连接 join(' ')
          }
          // --- 新增逻辑结束 ---
        }
      }
      // --- 注释提取结束 ---

      const paramTags = jsDocTags.filter(
        (tag): tag is ts.JSDocParameterTag => tag.tagName.text === "param",
      );
      const paramTagMap = new Map<string, ts.JSDocParameterTag>();
      paramTags.forEach((tag) => {
        // JSDoc @param {type} [name] - description
        // name 可能被 [] 包裹表示可选
        if (tag.name) {
          const paramName = tag.name.getText(sourceFile).replace(/[\[\]]/g, "");
          paramTagMap.set(paramName, tag);
        } else if (typeof tag.comment === "string") {
          // 确保 comment 是字符串
          // 尝试从注释中提取名称，例如 "@param {string} myParam - description"
          const match = /^\s*\{[^}]+\}\s+([\w$]+)/.exec(tag.comment);
          if (match && match[1]) {
            paramTagMap.set(match[1], tag);
          }
        }
      });

      // 遍历函数参数定义
      node.parameters.forEach((param) => {
        let parameterProcessed = false; // Flag to check if parameter was handled by expansion

        // --- Try to expand Interface/TypeLiteral parameters --- a
        if (
          (ts.isIdentifier(param.name) ||
            ts.isObjectBindingPattern(param.name)) &&
          param.type
        ) {
          let typeNodeToParse: ts.TypeNode | undefined = param.type;
          let interfaceName: string | undefined = undefined;

          if (
            ts.isTypeReferenceNode(typeNodeToParse) &&
            ts.isIdentifier(typeNodeToParse.typeName)
          ) {
            interfaceName = typeNodeToParse.typeName.getText(sourceFile);
          }

          // 1. Handle Interface Reference (e.g., args: MyInterface)
          if (interfaceName) {
            const interfaceDeclaration = findInterfaceDeclaration(
              interfaceName,
              sourceFile,
            );
            if (interfaceDeclaration) {
              const {
                properties: interfaceProps,
                required: interfaceRequired,
              } = parseInterfaceMembers(interfaceDeclaration, sourceFile);
              // Add parsed interface members directly to the function's parameters
              Object.assign(properties, interfaceProps);
              required.push(...interfaceRequired);
              parameterProcessed = true;
            }
            // 2. Handle Inline Type Literal (e.g., args: { prop1: string; }) - Less common for complex args
          } else if (ts.isTypeLiteralNode(typeNodeToParse)) {
            const { properties: literalProps, required: literalRequired } =
              parseInterfaceMembers(typeNodeToParse, sourceFile);
            Object.assign(properties, literalProps);
            required.push(...literalRequired);
            parameterProcessed = true;
          }
        }

        // --- Fallback to original parameter handling if not expanded ---
        if (!parameterProcessed) {
          if (ts.isIdentifier(param.name)) {
            const paramName = param.name.text;
            const paramTag = paramTagMap.get(paramName);

            // 优先使用 TS 类型注解，其次是 JSDoc 类型
            let paramSchemaType: ToolProperty;
            if (param.type) {
              paramSchemaType = mapTsTypeToJsonSchemaType(
                param.type,
                sourceFile,
              );
            } else if (paramTag?.typeExpression?.type) {
              paramSchemaType = mapTsTypeToJsonSchemaType(
                paramTag.typeExpression.type,
                sourceFile,
              );
            } else {
              // 无类型信息，默认为 string
              paramSchemaType = {
                type: "string",
                description: "无类型信息, 默认为 string",
              };
            }

            // 获取描述
            let paramDescription = paramSchemaType.description || ""; // 从类型映射中获取可能存在的描述
            let commentText = ""; // 在 if 外部声明 commentText
            if (paramTag && typeof paramTag.comment === "string") {
              // JSDoc 注释优先级更高，覆盖之前的描述
              // 需要去除类型和可能的名称部分
              commentText = paramTag.comment.trim(); // 赋值
              // 尝试移除 {type} 和 [name] / name 部分
              commentText = commentText
                .replace(/^\s*\{[^}]+\}\s*/, "")
                .replace(/^[\w$\[\]]+\s*-\s*/, "")
                .trim();
              if (commentText) {
                paramDescription = commentText;
              }
            }
            // 清理可能残留的类型映射描述
            if (
              paramDescription.startsWith("类型为") ||
              paramDescription.startsWith("未知或复杂类型") ||
              paramDescription.startsWith("类型引用:") ||
              paramDescription.startsWith("联合类型:") ||
              paramDescription.startsWith("交叉类型:") ||
              paramDescription === "内联对象类型" ||
              paramDescription === "无类型信息, 默认为 string" ||
              paramDescription === "未能解析类型，默认为 string"
            ) {
              // 如果 JSDoc 没有提供更好的描述，则保留类型映射的描述；否则清除它。
              if (
                !(
                  paramTag &&
                  typeof paramTag.comment === "string" &&
                  commentText
                )
              ) {
                // 保留类型映射的描述
              } else {
                paramDescription = commentText; // 使用 JSDoc 的描述
              }
            } else if (
              paramTag &&
              typeof paramTag.comment === "string" &&
              commentText
            ) {
              paramDescription = commentText; // 确保 JSDoc 优先
            }

            properties[paramName] = {
              ...paramSchemaType, // 包含 type 和可能的 items
              description: paramDescription || undefined, // 设置最终描述
            };

            // 判断是否必需
            const isOptional =
              param.questionToken ||
              param.initializer ||
              (paramTag && paramTag.isBracketed) ||
              (paramTag?.typeExpression &&
                ts.isJSDocOptionalType(paramTag.typeExpression.type));
            if (!isOptional) {
              required.push(paramName);
            }
          } else if (ts.isObjectBindingPattern(param.name)) {
            // Existing simplified object binding pattern handling (now less likely to be hit if type annotation exists and is expanded)
            let paramName = "__param_object"; // Placeholder
            let paramDescription = "对象解构参数，请参考其类型定义。";
            let paramSchemaType: ToolProperty = { type: "object" };
            let isOptional = !!(param.questionToken || param.initializer); // 确保初始值为 boolean

            if (
              param.type &&
              ts.isTypeReferenceNode(param.type) &&
              ts.isIdentifier(param.type.typeName)
            ) {
              const typeRefName = param.type.typeName.text;
              paramName = typeRefName; // 使用接口/类型名作为参数名
              paramSchemaType = mapTsTypeToJsonSchemaType(
                param.type,
                sourceFile,
              ); // 获取基础类型信息

              const paramTag = paramTagMap.get(typeRefName);
              if (paramTag && typeof paramTag.comment === "string") {
                let commentText = paramTag.comment
                  .trim()
                  .replace(/^\s*\{[^}]+\}\s*/, "")
                  .replace(/^[\w$\[\]]+\s*-\s*/, "")
                  .trim();
                if (commentText) {
                  paramDescription = commentText;
                }
              }
              // 检查JSDoc标签是否将此参数标记为可选
              if (
                paramTag &&
                (paramTag.isBracketed ||
                  (paramTag.typeExpression &&
                    ts.isJSDocOptionalType(paramTag.typeExpression.type)))
              ) {
                isOptional = true;
              }
            }

            properties[paramName] = {
              ...paramSchemaType,
              description: paramDescription,
            };

            if (!isOptional) {
              required.push(paramName);
            }
          }
        }
      });

      // --- 构建 ToolInfo 对象，根据是否有参数决定是否包含 parameters 字段 ---
      const toolData: FunctionCallProps = {
        name: functionName,
        description: funcDescription,
        parameters: null,
      };
      if (Object.keys(properties).length > 0) {
        toolData.parameters = {
          type: "object",
          properties: properties,
          required: required,
        };
      }

      toolsInfo[functionName] = toolData;
    }

    // 递归访问子节点
    ts.forEachChild(node, visit);
  }

  visit(sourceFile); // 开始遍历 AST

  result.tools = toolsInfo; // 将解析的工具信息赋值给 result.tools
  return result; // 返回新的结构
}
