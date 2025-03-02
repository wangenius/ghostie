import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cmd } from "@/utils/shell";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface EnvVar {
  key: string;
  value: string;
}

export function EnvEditor() {
  const [vars, setVars] = useState<EnvVar[]>([]);

  useEffect(() => {
    loadEnvVars();
  }, []);

  const loadEnvVars = async () => {
    try {
      const envVars = await cmd.invoke<EnvVar[]>("env_list");
      setVars(envVars);
    } catch (error) {
      cmd.message("加载环境变量失败", "error");
    }
  };

  const handleAdd = () => {
    setVars([...vars, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    setVars(vars.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const newVars = [...vars];
    newVars[index][field] = value;
    setVars(newVars);
  };

  const handleSave = async () => {
    try {
      // 验证是否有空的key
      if (vars.some((v) => !v.key.trim())) {
        cmd.message("环境变量名称不能为空", "error");
        return;
      }

      await cmd.invoke("env_save", { vars });
      await cmd.message("保存成功", "success");
      cmd.close();
    } catch (error) {
      cmd.message("保存失败", "error");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-2 justify-between flex-1">
        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            环境变量使用方式：<code>Deno.env.get("OPENAI_API_KEY");</code>
          </p>
        </div>
        <div className="space-y-2">
          {vars.map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="变量名"
                value={v.key}
                onChange={(e) => handleChange(i, "key", e.target.value)}
              />
              <Input
                placeholder="变量值"
                value={v.value}
                onChange={(e) => handleChange(i, "value", e.target.value)}
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleRemove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            添加环境变量
          </Button>
        </div>
        <div className="flex items-center justify-end">
          <Button variant="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

EnvEditor.open = () => {
  dialog({
    title: "环境变量",
    content: <EnvEditor />,
    width: 400,
    height: 500,
  });
};
