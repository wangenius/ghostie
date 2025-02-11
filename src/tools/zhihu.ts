// import { register } from "@/services/tool/register";
// import axios from "axios";

// interface ZhihuHotItem {
//   rank: number;
//   title: string;
//   hot: string;
//   url: string;
// }

// interface ZhihuResponse {
//   code: number;
//   data: ZhihuHotItem[];
//   message: string;
// }

// export class Zhihu {
//   private static readonly API_ENDPOINT =
//     "https://api.istero.com/resource/zhihu/top";
//   private static readonly API_TOKEN = import.meta.env.ZHIHU_API_TOKEN;

//   @register("获取知乎热搜榜", {
//     limit: {
//       type: "number",
//       description: "返回热搜条数",
//       required: false,
//     },
//   })
//   static async getHotTopics(limit: number = 10): Promise<ZhihuHotItem[]> {
//     if (!Zhihu.API_TOKEN) {
//       throw new Error(
//         "未配置知乎 API Token，请在环境变量中设置 ZHIHU_API_TOKEN"
//       );
//     }

//     try {
//       const response = await axios.get<ZhihuResponse>(Zhihu.API_ENDPOINT, {
//         params: {
//           token: Zhihu.API_TOKEN,
//         },
//       });

//       if (response.data.code !== 200) {
//         throw new Error(
//           `知乎 API 返回错误: ${response.data.message || "未知错误"}`
//         );
//       }

//       // 根据 limit 参数限制返回数量
//       return response.data.data.slice(0, limit);
//     } catch (error: unknown) {
//       if (axios.isAxiosError(error)) {
//         throw new Error(`获取知乎热搜失败: ${error.message}`);
//       }
//       throw error;
//     }
//   }
// }
