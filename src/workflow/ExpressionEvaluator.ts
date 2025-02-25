type Value = string | number | boolean | null | undefined;
type Context = Record<string, any>;

export class ExpressionEvaluator {
  private context: Context = {};

  private evaluateComparison(
    left: Value,
    operator: string,
    right: Value
  ): boolean {
    switch (operator) {
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case ">":
        return (left as number) > (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "<":
        return (left as number) < (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case "contains":
        return String(left).includes(String(right));
      case "startsWith":
        return String(left).startsWith(String(right));
      case "endsWith":
        return String(left).endsWith(String(right));
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private evaluateLogical(
    left: boolean,
    operator: string,
    right: boolean
  ): boolean {
    switch (operator) {
      case "&&":
        return left && right;
      case "||":
        return left || right;
      default:
        throw new Error(`Unsupported logical operator: ${operator}`);
    }
  }

  private getValue(path: string): Value {
    const parts = path.split(".");
    let value: any = this.context;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  private parseExpression(expression: string): boolean {
    // 支持基本的逻辑运算符
    const logicalParts = expression.split(/\s*(&&|\|\|)\s*/);
    if (logicalParts.length > 1) {
      const operator = expression.match(/(&&|\|\|)/)?.[0];
      if (!operator) throw new Error("Invalid logical expression");

      const left = this.parseExpression(logicalParts[0]);
      const right = this.parseExpression(logicalParts[2]);
      return this.evaluateLogical(left, operator, right);
    }

    // 解析比较表达式
    const match = expression.match(
      /^\s*(.+?)\s*(==|!=|>|>=|<|<=|contains|startsWith|endsWith)\s*(.+?)\s*$/
    );
    if (!match) {
      throw new Error(`Invalid expression: ${expression}`);
    }

    const [, leftStr, operator, rightStr] = match;

    // 解析值（支持变量引用和字面量）
    const parseValue = (str: string): Value => {
      // 移除引号
      str = str.trim().replace(/^["']|["']$/g, "");

      // 尝试解析数字
      if (/^-?\d+(\.\d+)?$/.test(str)) {
        return parseFloat(str);
      }

      // 尝试解析布尔值
      if (str === "true") return true;
      if (str === "false") return false;
      if (str === "null") return null;

      // 解析变量引用
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(str)) {
        return this.getValue(str);
      }

      // 作为字符串返回
      return str;
    };

    const left = parseValue(leftStr);
    const right = parseValue(rightStr);

    return this.evaluateComparison(left, operator, right);
  }

  public evaluate(expression: string, context: Context): boolean {
    this.context = context;
    return this.parseExpression(expression);
  }
}
