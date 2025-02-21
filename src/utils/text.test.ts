import { splitTextIntoChunks } from "./text";

describe("splitTextIntoChunks", () => {
  it("应该正确处理混合中英文内容的文本分块", () => {
    const text = `

1. 尽早意识到社会规则是大型真人RPG——真正的玩家都明白，高考/考研/考公不过是新手村任务，关键要解锁「**生产资料持有者**」的隐藏角色

2. 警惕「年轻人该吃苦」的催眠话术，牛马吃再多苦也变不成牧场主。用经济学思维解构人生：[边际效益](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=边际效益&zhida_source=entity)、[机会成本](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=机会成本&zhida_source=entity)、[杠杆原理](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=杠杆原理&zhida_source=entity)才是真实世界的元规则

3. 把「**搞钱**」设为优先级前三的日常程序，但记住金钱是生产资料不是消费标的。穿梭在[CBD](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=CBD&zhida_source=entity)的[社畜](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=社畜&zhida_source=entity)和[城中村摊贩](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=城中村摊贩&zhida_source=entity)，本质都是[资本系统](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=资本系统&zhida_source=entity)的生物电池

4. 在婚恋市场，美貌分红率正以每年7.8%递减，认知复利却以12.4%递增。选择伴侣本质是收购初创公司，重点考察**资产负债表**（抗风险能力）和**现金流量表**（情绪价值产出）

5. 学会制造「可控溃败」。**定期暴露自己的不完美**，就像杀毒软件更新漏洞补丁——那些被你弱点吓退的，本就是该被筛选掉的低质量人际关系

6. 建立「[数字墓碑](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=数字墓碑&zhida_source=entity)」文件夹，**定期埋葬被算法毒害的时间**。记住抖音每分钟创造600万刀估值的同时，正在肢解你最后的深度思考能力

7. 拒绝成为「**孝顺期货**」。父母对你的失望本质是投资失败的情绪清算，必要时切断原生家庭的PUA分红机制，不让家族认知天花板成为你的死亡税率

8. 把「**[原生家庭创伤](https://zhida.zhihu.com/search?content_id=713661495&content_type=Answer&match_order=1&q=原生家庭创伤&zhida_source=entity)**」做成NFT上链，每天允许自己交易10分钟痛苦回忆。剩余23小时50分钟，请切换成冷酷的量化交易员模式

9. **看清消费主义的宗教本质**：当你为「中产生活方式」标签氪金时，资本正在用你的生存焦虑铸造新神像。真正的玩家都在搭建反消费巴别塔

10. 最后记住：所有命运馈赠的挫折，早在暗中标好了进化价码。把自己当成正在迭代的AI模型——**痛苦是训练集的标注数据，崩溃是必要的梯度下降**
`;

    const chunks = splitTextIntoChunks(text, 500);
    console.log(chunks);
  });
});
