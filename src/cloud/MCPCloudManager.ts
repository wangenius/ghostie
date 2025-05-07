import { supabase } from "@/utils/supabase";

export class MCPCloudManager {
  static async getMarketData(page: number, limit: number) {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const { data, error } = await supabase
      .from("mcp")
      .select("*")
      .order("created_at", { ascending: false })
      .range(start, end);
    if (error) {
      throw error;
    }
    return data;
  }

  static async deleteMCP(id: string) {
    const { error } = await supabase.from("mcp").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }
}
