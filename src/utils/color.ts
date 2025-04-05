// 为任意字符串生成独特的颜色
const getColor = (str: string | undefined): string => {
  if (!str) {
    return "transparent";
  }
  // 生成字符串的哈希值
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 1) - hash);
  }

  // 确保色相值在0-360之间
  const hue = Math.abs(hash % 360);

  // 使用 HSL 颜色空间，固定饱和度和亮度以确保颜色美观
  return `hsla(${hue}, 10%, 50%, 0.9)`;
};

export { getColor };
