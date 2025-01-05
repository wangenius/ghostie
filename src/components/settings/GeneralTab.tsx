import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { ChevronRight, Globe2, Keyboard, Moon, Power, RefreshCw, RotateCw, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface Settings {
	theme: 'light' | 'dark' | 'system';
	language: 'zh-CN' | 'en-US';
	shortcut: string;
	autoUpdate: boolean;
	autoLaunch: boolean;
}

// 主题持久化 key
const THEME_KEY = 'app-theme';

export function GeneralTab() {
	const [settings, setSettings] = useState<Settings>({
		theme: (localStorage.getItem(THEME_KEY) as Settings['theme']) || 'system',
		language: 'zh-CN',
		shortcut: 'Ctrl+Shift+Space',
		autoUpdate: true,
		autoLaunch: false,
	});

	const [checking, setChecking] = useState(false);

	useEffect(() => {
		// 如果启用了自动更新，定期检查更新
		if (settings.autoUpdate) {
			const checkInterval = setInterval(checkForUpdates, 1000 * 60 * 60); // 每小时检查一次
			return () => clearInterval(checkInterval);
		}
	}, [settings.autoUpdate]);

	const checkForUpdates = async () => {
		try {
			const hasUpdate = await invoke<boolean>('check_update');
			console.log(hasUpdate);

			if (hasUpdate) {
				// 如果有更新，安装并重启
				await invoke('install_update');
				await relaunch();
			}

			return hasUpdate;
		} catch (error) {
			console.error('更新检查失败:', error);
			return false;
		}
	};

	const checkUpdate = async () => {
		setChecking(true);
		try {
			const hasUpdate = await checkForUpdates();
			if (!hasUpdate) {
				// TODO: 使用 dialog 插件显示提示
				console.log('已经是最新版本');
			}
		} finally {
			setChecking(false);
		}
	};

	// 监听系统主题变化并应用主题
	useEffect(() => {
		const applyTheme = (theme: 'light' | 'dark' | 'system') => {
			// 保存到本地存储
			localStorage.setItem(THEME_KEY, theme);

			// 根据主题设置应用类名
			if (theme === 'system') {
				const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				document.documentElement.classList.toggle('dark', isDark);
			} else {
				document.documentElement.classList.toggle('dark', theme === 'dark');
			}
		};

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (settings.theme === 'system') {
				applyTheme('system');
			}
		};

		applyTheme(settings.theme);
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [settings.theme]);

	const toggleTheme = () => {
		const themeMap = {
			'light': 'dark',
			'dark': 'system',
			'system': 'light'
		} as const;
		setSettings({ ...settings, theme: themeMap[settings.theme] });
	};

	const getThemeText = () => {
		const themeTexts = {
			'light': '浅色模式',
			'dark': '深色模式',
			'system': '跟随系统'
		};
		return themeTexts[settings.theme];
	};

	return (
		<div className="space-y-1">
			<div
				onClick={toggleTheme}
				className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-secondary"
			>
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						{settings.theme === 'light' ? <Sun className="w-[18px] h-[18px]" /> :
							settings.theme === 'dark' ? <Moon className="w-[18px] h-[18px]" /> :
								<div className="w-[18px] h-[18px] flex">
									<Sun className="w-[18px] h-[18px] absolute" />
									<Moon className="w-[18px] h-[18px] relative left-2" />
								</div>
						}
					</div>
					<div>
						<div className="text-sm text-foreground">外观</div>
						<div className="text-xs text-muted-foreground">{getThemeText()}</div>
					</div>
				</div>
				<ChevronRight className="w-4 h-4 text-muted-foreground" />
			</div>

			<div
				onClick={() => setSettings({ ...settings, language: settings.language === 'zh-CN' ? 'en-US' : 'zh-CN' })}
				className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-secondary"
			>
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						<Globe2 className="w-[18px] h-[18px]" />
					</div>
					<div>
						<div className="text-sm text-foreground">语言</div>
						<div className="text-xs text-muted-foreground">{settings.language === 'zh-CN' ? '简体中文' : 'English'}</div>
					</div>
				</div>
				<ChevronRight className="w-4 h-4 text-muted-foreground" />
			</div>

			<div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						<Keyboard className="w-[18px] h-[18px]" />
					</div>
					<div>
						<div className="text-sm text-foreground">快捷键</div>
						<div className="text-xs text-muted-foreground">{settings.shortcut}</div>
					</div>
				</div>
				<ChevronRight className="w-4 h-4 text-muted-foreground" />
			</div>

			<div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						<RefreshCw className="w-[18px] h-[18px]" />
					</div>
					<div>
						<div className="text-sm text-foreground">自动更新</div>
						<div className="text-xs text-muted-foreground">当有新版本时自动通知</div>
					</div>
				</div>
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						checked={settings.autoUpdate}
						onChange={(e) => setSettings({ ...settings, autoUpdate: e.target.checked })}
						className="sr-only peer"
					/>
					<div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
				</label>
			</div>

			<div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						<Power className="w-[18px] h-[18px]" />
					</div>
					<div>
						<div className="text-sm text-foreground">开机自启动</div>
						<div className="text-xs text-muted-foreground">启动系统时自动运行</div>
					</div>
				</div>
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						checked={settings.autoLaunch}
						onChange={(e) => setSettings({ ...settings, autoLaunch: e.target.checked })}
						className="sr-only peer"
					/>
					<div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
				</label>
			</div>

			<div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
				<div className="flex items-center gap-3">
					<div className="text-muted-foreground">
						<RotateCw className={`w-[18px] h-[18px] ${checking ? 'animate-spin' : ''}`} />
					</div>
					<div>
						<div className="text-sm text-foreground">检查更新</div>
						<div className="text-xs text-muted-foreground">当前版本: v1.0.0</div>
					</div>
				</div>
				<button
					onClick={checkUpdate}
					disabled={checking}
					className="px-3 py-1 text-sm text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
				>
					{checking ? '检查中...' : '检查更新'}
				</button>
			</div>
		</div>
	);
} 