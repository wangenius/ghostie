import { TbPlus } from "react-icons/tb";



export function SpaceTab() {



    const handleOpenSpaceAdd = async () => {
    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleOpenSpaceAdd}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                    <TbPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">添加空间</span>
                </button>


            </div>
        </div>
    );
}
