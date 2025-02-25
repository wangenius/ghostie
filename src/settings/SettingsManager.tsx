import { Echo } from "echo-state";

interface SettingsProps {
	theme: { name: string, label: string };
	font: { name: string, label: string };
	language: string;
	reActMaxIterations: number;
	sortType: 'default' | 'mostUsed' | 'recentUsed';
	maxHistory: number;
	knowledge: {
		threshold: number;
		limit: number;
		contentModel: string;
		searchModel: string;
	};
}

/* 设置管理 */
export class SettingsManager {
	private static store = new Echo<SettingsProps>({
		theme: { name: "light", label: "浅色" },
		font: { name: "siyuan", label: "思源" },
		language: "zh-CN",
		reActMaxIterations: 10,
		sortType: 'default',
		maxHistory: 30,
		knowledge: {
			threshold: 0.6,
			limit: 10,
			contentModel: "",
			searchModel: "",
		},
	}, {
		name: "settings",
		sync: true,
	});

	static use = this.store.use.bind(this.store)

	static get current() {
		return this.store.current;
	}

	public static getTheme() {
		return this.store.current.theme;
	}

	public static setKnowledge(knowledge: Partial<SettingsProps["knowledge"]>) {
		this.store.set((prev) => ({ ...prev, knowledge: { ...prev.knowledge, ...knowledge } }));
	}

	public static getReactMaxIterations() {
		return this.store.current.reActMaxIterations;
	}

	public static setReactMaxIterations(maxIterations: number) {
		this.store.set((prev) => ({ ...prev, reActMaxIterations: maxIterations }));
	}

	public static setTheme(theme: { name: string, label: string }) {
		this.store.set((prev) => ({ ...prev, theme }));
	}

	public static getSortType() {
		return this.store.current.sortType;
	}

	public static setSortType(sortType: 'default' | 'mostUsed' | 'recentUsed') {
		this.store.set((prev) => ({ ...prev, sortType }));
	}

	public static getFont() {
		return this.store.current.font;
	}

	public static setFont(font: { name: string, label: string }) {
		this.store.set((prev) => ({ ...prev, font }));
	}

	public static getMaxHistory() {
		return this.store.current.maxHistory;
	}

	public static setMaxHistory(maxHistory: number) {
		this.store.set((prev) => ({ ...prev, maxHistory }));
	}

}

