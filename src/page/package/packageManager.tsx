import { PackageInfo } from "@/common/types/model";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BundleManager } from "@/services/bundle/BundleManager";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbPackage, TbTrash } from "react-icons/tb";

export const PackageManager = () => {
	const [packages, setPackages] = useState<PackageInfo[]>([]);
	const [newPackage, setNewPackage] = useState("");
	const [version, setVersion] = useState("");
	const [loading, setLoading] = useState(false);

	// 加载已安装的包
	const loadPackages = async () => {
		try {
			const pkgs = await BundleManager.getAllBundles();
			setPackages(pkgs);
		} catch (error) {
			console.error("加载包列表失败:", error);
			cmd.message(String(error), "错误", "error");
		}
	};

	useEffect(() => {
		loadPackages();
	}, []);

	// 安装新包
	const handleInstall = async () => {
		if (!newPackage) return;

		try {
			setLoading(true);
			console.log(newPackage);

			const [name, bundle] = await cmd.invoke<[string, string]>("install_package", {
				name: newPackage,
				version: version || undefined
			});

			// 保存打包结果到 IndexDB
			await BundleManager.saveBundle(name, bundle, version || "latest");

			setNewPackage("");
			setVersion("");

			await loadPackages();
			cmd.message(`包 ${newPackage} 安装成功`, "成功");
		} catch (error) {
			console.error("安装失败:", error);
			cmd.message(String(error), "安装失败", "error");
		} finally {
			setLoading(false);
		}
	};

	// 卸载包
	const handleUninstall = async (name: string) => {
		try {
			setLoading(true);
			// 从 IndexDB 中删除打包结果
			await BundleManager.deleteBundle(name);
			await loadPackages();
			cmd.message(`包 ${name} 卸载成功`, "成功");
		} catch (error) {
			console.error("卸载失败:", error);
			cmd.message(String(error), "卸载失败", "error");
		} finally {
			setLoading(false);
		}
	};


	console.log(packages);

	return (
		<div className="flex flex-col h-screen bg-background">
			<Header title="依赖管理" />

			<div className="flex-1 p-4 space-y-4 overflow-auto">
				{/* 安装新包 */}
				<div className="space-y-2">
					<div className="text-sm text-muted-foreground">安装新包</div>
					<div className="flex gap-2">
						<Input
							value={newPackage}
							onChange={(e) => setNewPackage(e.target.value)}
							placeholder="包名称"
							className="flex-1"
						/>
						<Input
							value={version}
							onChange={(e) => setVersion(e.target.value)}
							placeholder="版本（可选）"
							className="w-32"
						/>
						<Button
							variant="primary"
							className="h-10"
							onClick={handleInstall}
							disabled={!newPackage || loading}
						>
							安装
						</Button>
					</div>
				</div>

				{/* 已安装的包列表 */}
				<div className="space-y-2">
					<div className="text-sm text-muted-foreground">已安装的包</div>
					<div className="space-y-2">
						{packages.map((pkg) => (
							<div
								key={pkg.name}
								className="flex items-center justify-between p-3 bg-secondary rounded-md"
							>
								<div className="flex items-center gap-2">
									<TbPackage className="w-4 h-4 text-muted-foreground" />
									<div>
										<div className="text-sm font-medium">
											{pkg.name}
											<span className="ml-2 text-xs text-muted-foreground">
												{pkg.version}
											</span>
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleUninstall(pkg.name)}
									disabled={loading}
								>
									<TbTrash className="w-4 h-4" />
								</Button>
							</div>
						))}
						{packages.length === 0 && (
							<div className="text-sm text-muted-foreground text-center py-8">
								暂无已安装的包
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

PackageManager.open = () => {
	cmd.open("package-manager", {}, {
		width: 500,
		height: 600,
	});
};
