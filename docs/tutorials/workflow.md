---
title: 工作流开发
order: 4
---

# 工作流

## 什么是工作流

工作流是 Ghostie 中的一个重要组成部分，使用工作流来实现复杂流程。

## 开发

### 引用

所有的接口引用都使用 <span v-pre>{{inputs.节点 ID.result}}</span> 来引用。在任何输入字符串的地方可采用这种方式来引用。（包括代码节点）

```
{{inputs.start.result.query.name}} - 引用start节点的result参数的query属性中的name属性
{{inputs.XXXXX.result.data.name}} - 引用XXXXX节点的result参数的data属性中的name属性
```

1. inputs 表示该引用来自输入端点
2. 第二位表示连接 input 端口的某个节点的 ID
3. 第三位表示该节点 outputs 中的 JSON 对象的嵌套属性名。 一般根为 result , 如果获取不到，可以通过 panel 节点来查看。

### 代码节点

代码节点使用 javascript 来编写。
代码参考：

```js
// 在工作流节点中的代码可以这样写：
const sum = inputs.start.query.number1 + inputs.xxxxx.result.number2;
console.log("计算结果:", sum);
return sum;
```

1. 直接在代码中使用 inputs 来获取输入端点的数据
2. 支持使用 console.log 来输出日志
3. 最终须要调用 return 来返回结果。

### 其他节点

其他节点，如：chat、bot、plugin、branch、iterator、code、panel 等，都是直接使用输入端点的数据。

bot，plugin，chat 等节点输入一般用 result 包裹结果。所以需要使用 <span v-pre>{{inputs.节点 ID.result}}</span> 来引用。

如果不确定，可以使用 panel 节点来查看某个节点的输出端点的数据。
