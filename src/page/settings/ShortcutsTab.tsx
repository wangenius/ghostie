import { TbCommand, TbKeyboard } from "react-icons/tb";

export default function ShortcutsTab() {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Global Shortcuts
        </div>
        <div className="grid gap-1">
          <ShortcutItem
            icon={<TbCommand />}
            title="Open/Hide Window"
            shortcut="Alt + Space"
          />
          <ShortcutItem
            icon={<TbKeyboard />}
            title="Focus Input Box"
            shortcut="Ctrl + I"
          />
          <ShortcutItem
            icon={<TbKeyboard />}
            title="Open History"
            shortcut="Ctrl + H"
          />
          <ShortcutItem
            icon={<TbKeyboard />}
            title="End Conversation"
            shortcut="Ctrl + O"
          />
          <ShortcutItem
            icon={<TbKeyboard />}
            title="Stop Generation"
            shortcut="Ctrl + P"
          />
        </div>

        <div className="text-sm font-medium text-muted-foreground mb-2 mt-6">
          Settings Shortcuts
        </div>
        <div className="grid gap-4">
          <ShortcutItem
            icon={<TbCommand />}
            title="Open Settings"
            shortcut="Ctrl + ,"
          />
          <ShortcutItem
            icon={<TbKeyboard />}
            title="Close Settings"
            shortcut="Esc"
          />
        </div>
      </div>
    </div>
  );
}

interface ShortcutItemProps {
  icon: React.ReactNode;
  title: string;
  shortcut: string;
}

function ShortcutItem({ icon, title, shortcut }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {shortcut.split("+").map((key, index) => (
          <div key={key}>
            <kbd className="px-2 py-1 text-xs rounded bg-muted">
              {key.trim()}
            </kbd>
            {index < shortcut.split("+").length - 1 && (
              <span className="text-muted-foreground">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
