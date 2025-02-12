import { Echo } from "echo-state";

interface SettingsProps {
	theme: { name: string, label: string };
	language: string;
}

export class SettingsManager {
	private static store = new Echo<SettingsProps>({
		theme: { name: "light", label: "浅色" },
		language: "zh-CN",
	}, {
		name: "settings",
		sync: true
	});

	static use = this.store.use.bind(this.store)

	public static getTheme() {
		return this.store.current.theme;
	}

	public static setTheme(theme: { name: string, label: string }) {
		this.store.set((prev) => ({ ...prev, theme }), true);
	}


}

