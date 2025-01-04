import { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("搜索:", searchQuery);
    };

  useEffect(() => {
    // 聚焦输入框
    inputRef.current?.focus();
    
    window.addEventListener("focus", () => {
      setSearchQuery("");
      inputRef.current?.focus();
    });
  }, []);

  return (
    <div className="search-dialog">
      <div className="search-header">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="开始键入..."
            className="search-input"
          />
        </div>
      </div>

      <div className="search-content">
        <div className="shortcut-section">
          <h3>插件关键字</h3>
          <div className="shortcut-list">
            <div className="shortcut-item">
              <span className="shortcut-key">=</span>
              <span className="shortcut-desc">计算数学公式(例如 5*3-2)</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">!!</span>
              <span className="shortcut-desc">访问以前选择的结果</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">?</span>
              <span className="shortcut-desc">搜索文件和文件夹</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">@</span>
              <span className="shortcut-desc">打开 PowerToys 实用程序和设置</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">.</span>
              <span className="shortcut-desc">搜索程序</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
