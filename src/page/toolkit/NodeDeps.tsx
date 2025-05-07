import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cmd } from "@/utils/shell";
import { Loader2, Package, PackagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function NodeDeps() {
  const [dependencies, setDependencies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newPackage, setNewPackage] = useState("");
  const [installingPackages, setInstallingPackages] = useState<string[]>([]);
  const [removingPackages, setRemovingPackages] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // 获取依赖列表
  useEffect(() => {
    loadDependencies();

    // 监听依赖安装进度
    let unlistenFn: () => void;

    const setupListener = async () => {
      unlistenFn = await cmd.listen("node_dependency_progress", (message) => {
        if (
          message.payload.includes("安装成功") ||
          message.payload.includes("更新成功") ||
          message.payload.includes("删除成功")
        ) {
          setProgressMessage("");
        } else {
          setProgressMessage(message.payload);
        }
      });
    };

    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const deps = await cmd.invoke<Record<string, string>>(
        "node_list_dependencies",
      );
      setDependencies(deps || {});
    } catch (error) {
      cmd.message("获取依赖列表失败", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!newPackage.trim()) {
      cmd.message("请输入要安装的包名", "warning");
      return;
    }

    try {
      const packageName = newPackage.trim();
      setInstallingPackages([...installingPackages, packageName]);
      setProgressMessage(`正在安装 ${packageName}...`);

      const success = await cmd.invoke<boolean>("node_install_dependency", {
        window: {}, // Tauri会自动补充window参数
        packages: [packageName],
        dev: false,
      });

      if (success) {
        setNewPackage("");
        loadDependencies();
      } else {
        cmd.message(`安装依赖 ${packageName} 失败`, "error");
      }
    } catch (error) {
      cmd.message("安装依赖失败", "error");
      console.error(error);
    } finally {
      setInstallingPackages(installingPackages.filter((p) => p !== newPackage));
    }
  };

  const handleUninstall = async (packageName: string) => {
    try {
      if (packageName == "ts-node" || packageName == "typescript") {
        dialog.message(`${packageName} 是系统依赖,不支持删除`);
        return;
      }
      dialog.confirm({
        title: "删除依赖",
        content: `确定要删除依赖 ${packageName} 吗？`,
        onOk: async () => {
          setRemovingPackages([...removingPackages, packageName]);
          setProgressMessage(`正在删除 ${packageName}...`);

          const success = await cmd.invoke<boolean>(
            "node_uninstall_dependency",
            {
              window: {}, // Tauri会自动补充window参数
              packages: [packageName],
            },
          );

          if (success) {
            loadDependencies();
          } else {
            cmd.message(`删除依赖 ${packageName} 失败`, "error");
          }
        },
        onCancel: () => {
          cmd.message("取消删除依赖", "warning");
        },
      });
    } catch (error) {
      cmd.message("删除依赖失败", "error");
      console.error(error);
    } finally {
      setRemovingPackages(removingPackages.filter((p) => p !== packageName));
    }
  };

  const handleUpdateAll = async () => {
    try {
      const checked = await cmd.confirm("确定要更新所有依赖吗？");
      if (!checked) return;
      setUpdating(true);
      setProgressMessage("正在更新所有依赖...");

      const success = await cmd.invoke<boolean>("node_update_dependencies", {});

      if (success) {
        cmd.message("所有依赖更新成功", "success");
        loadDependencies();
      } else {
        cmd.message("更新依赖失败", "error");
      }
    } catch (error) {
      cmd.message("更新依赖失败", "error");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const sortedDependencies = Object.entries(dependencies)
    .filter(([name]) => name != "ts-node" && name != "typescript")
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-3 justify-between flex-1">
        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg mb-2">
          <p className="text-xs text-muted-foreground">
            使用插件时需要的Node.js依赖包管理。安装后可以在插件中通过
            <code>import</code> 语句引入使用。
          </p>
        </div>

        {progressMessage && (
          <div className="text-xs bg-muted p-2 rounded mb-2 flex items-center">
            <Loader2 size={12} className="mr-2 animate-spin" />
            {progressMessage}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="输入包名，例如: axios@latest"
            value={newPackage}
            onChange={(e) => setNewPackage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInstall()}
          />
          <Button
            variant="outline"
            onClick={handleInstall}
            disabled={installingPackages.includes(newPackage)}
          >
            {installingPackages.includes(newPackage) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            安装
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">
              已安装的依赖 ({sortedDependencies.length})
            </h3>
            <Button
              size="icon"
              onClick={handleUpdateAll}
              disabled={updating || sortedDependencies.length === 0}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedDependencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>暂无已安装的依赖</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDependencies.map(([name, version]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2 rounded border border-border"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{version}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUninstall(name)}
                    disabled={removingPackages.includes(name)}
                  >
                    {removingPackages.includes(name) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

NodeDeps.open = () => {
  dialog({
    title: "Node.js依赖管理",
    content: <NodeDeps />,
    width: 600,
    height: 500,
  });
};
