const THEME_KEY = 'app-theme';

type Theme = 'light' | 'dark' | 'system';

export function initTheme() {
  const theme = (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
    }
  };

  mediaQuery.addEventListener('change', handleChange);
} 