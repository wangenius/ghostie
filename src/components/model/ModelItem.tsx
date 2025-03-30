import { Model } from "@/model/types/model";
import { TbBox, TbPencil, TbTrash } from "react-icons/tb";
import { Button } from "../ui/button";

interface ModelItemProps {
  id: string;
  model: Model;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
}

export function ModelItem({ id, model, onEdit, onDelete }: ModelItemProps) {
  return (
    <div className="group relative rounded-lg transition-all duration-200 select-none">
      {/* 主内容区 */}
      <div className="flex items-center p-2 gap-3">
        {/* 左侧图标 */}
        <div className="shrink-0">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted p-2">
            <TbBox className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* 中间信息区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate">
              {model.name}
            </h3>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{model.model}</span>
          </div>
        </div>

        {/* 右侧操作区 */}
        <div className="shrink-0 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(id);
            }}
          >
            <TbPencil className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            <TbTrash className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
