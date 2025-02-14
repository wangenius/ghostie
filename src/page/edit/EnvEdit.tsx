import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { cmd } from "@/utils/shell";
import { Header } from "@/components/custom/Header";

interface EnvVar {
	key: string;
	value: string;
}

export function EnvEdit() {
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

	const handleChange = (index: number, field: "key" | "value", value: string) => {
		const newVars = [...vars];
		newVars[index][field] = value;
		setVars(newVars);
	};

	const handleSave = async () => {
		try {
			// 验证是否有空的key
			if (vars.some(v => !v.key.trim())) {
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
		<div className="h-full flex flex-col gap-2">
			<Header title="环境变量" />
			<div className="p-4 space-y-2 flex flex-col gap-2 justify-between flex-1">
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
								variant='destructive'
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
					<Button variant="primary" onClick={handleSave}>保存</Button>
				</div>
			</div>



		</div>
	);
}

EnvEdit.open = () => {
	cmd.open("env-edit", {}, {
		width: 400,
		height: 500,
	});
};

