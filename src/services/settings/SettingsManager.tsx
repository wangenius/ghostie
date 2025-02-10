import { Echo } from "echo-state";

interface SettingsProps {
	theme: string;
	language: string;
}

export class SettingsManager {
	private static store = new Echo<SettingsProps>({
		theme: "light",
		language: "zh-CN",
	}, {
		name: "settings",
		sync: true,
		onChange: (value, oldValue) => {
			if (value.theme !== oldValue.theme) {
				document.documentElement.setAttribute('data-theme', value.theme);
			}
		},
	});

	static use = this.store.use.bind(this.store)

	public static getTheme() {
		return this.store.current.theme;
	}

	public static setTheme(theme: string) {
		this.store.set((prev) => ({ ...prev, theme }), true);
	}


}

