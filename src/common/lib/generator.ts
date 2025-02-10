/**
 * 生成一个唯一的ID
 * @returns 16位唯一ID，前8位基于时间戳，后8位基于密码学安全的随机数，包含大小写字母和数字
 */
export class Generator {
    static id: () => string = (() => {
        // 将字符映射表移到闭包中，避免重复创建
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charsLength = chars.length;

        return () => {
            const timestamp = Date.now();

            // 优化时间戳部分的生成
            const timeArray = new Uint8Array(8);
            for (let i = 0; i < 8; i++) {
                timeArray[i] = ((timestamp >> (i * 4)) ^ (timestamp >> (i * 2))) & 0x3f;
            }

            // 生成随机部分
            const randomArray = new Uint8Array(8);
            crypto.getRandomValues(randomArray);

            // 合并并转换为字符
            return Array.from(
                [...randomArray, ...timeArray],
                (byte) => chars[byte % charsLength]
            ).join("");
        };
    })();
}

export const gen = Generator;
