import { ArrowLeft, Clock, Loader, Loader2Icon, Settings, X } from "lucide-react";
import { RefObject } from "react";
import { View } from "../types";

interface Props {
  inputValue: string;
  currentView: View;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onViewChange: (view: View) => void;
}

export function SearchBar({
  inputValue,
  currentView,
  isLoading,
  inputRef,
  onInputChange,
  onKeyDown,
  onViewChange,
}: Props) {
  return (
    <div className="pt-2 px-4">
      <div  className="relative">
        {currentView !== "list" ? (
          <button
            onClick={() => onViewChange("list")}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft
              className="w-5 h-5 text-gray-400 
              hover:text-gray-600"
            />
          </button>
        ) : (
          <button  className="absolute left-0 top-1/2 -translate-y-1/2">
            <img src={"/icon.png"} alt="logo" className="w-5 h-5" />
          </button>
        )}
        {currentView === "chat" || currentView === "list" ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full pl-8 text-sm pr-24 h-10 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
            placeholder={"输入消息..."}
          />
        ) : (
          <div className="w-full pl-8 h-10 text-gray-600 leading-10">
            {currentView === "history"
              ? "历史记录"
              : currentView === "settings"
              ? "设置"
              : null}
          </div>
        )}

        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <Loader2Icon className="w-[18px] h-[18px] animate-spin" />
            </button>
          )}

          {currentView !== "list" && (
            <button
              onClick={() => onViewChange("list")}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}

          {currentView === "list" && (
            <>
              <button
                onClick={() => onViewChange("history")}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
              >
                <Clock className="w-[18px] h-[18px]" />
              </button>

              <button
                onClick={() => onViewChange("settings")}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
