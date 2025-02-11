import { Env } from "@/services/data/env";
import { register } from "@/services/tool/decorators";
import axios from "axios";

export class Toutiao {
  @register("获取头条新闻", {
    keyword: {
      type: "string",
      description:
        "关键词, 支持类型: top(推荐,默认), guonei(国内), guoji(国际), yule(娱乐), tiyu(体育), junshi(军事), keji(科技), caijing(财经), youxi(游戏), qiche(汽车), jiankang(健康)",
    },
  })
  static async getNews({ keyword = "top" }: { keyword?: string }) {
    // 基本参数配置
    const apiUrl = "http://v.juhe.cn/toutiao/index"; // 接口请求URL

    // 接口请求入参配置
    const requestParams = {
      key: Env.get("JUHE_API_KEY"),
      type: keyword,
      page: "1",
      page_size: "10",
      is_filter: "",
    };

    // 发起接口网络请求
    const response = await axios.get(apiUrl, { params: requestParams });

    // 解析响应结果
    if (response.status === 200) {
      const responseResult = response.data;
      return responseResult.result.data;
    } else {
      // 网络异常等因素，解析结果异常。可依据业务逻辑自行处理。
      console.log("请求异常");
    }
  }

  @register("获取头条新闻详情", {
    uniquekey: {
      type: "string",
      description: "新闻uniquekey",
    },
  })
  static async getNewsDetail({ uniquekey }: { uniquekey: string }) {
    const apiUrl = "http://v.juhe.cn/toutiao/content"; // 接口请求URL

    // 接口请求入参配置
    const requestParams = {
      key: Env.get("JUHE_API_KEY"),
      uniquekey,
    };

    // 发起接口网络请求
    const response = await axios.get(apiUrl, { params: requestParams });

    // 解析响应结果
    if (response.status === 200) {
      const responseResult = response.data;
      return responseResult.result;
    } else {
      // 网络异常等因素，解析结果异常。可依据业务逻辑自行处理。
      console.log("请求异常");
    }
  }
}
