import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbDownload, TbUpload } from "react-icons/tb";



export function KnowledgeTab() {



    const handleOpenSpaceAdd = async () => {
    };

    return (
        <div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">

                </div>
                <div className="flex items-center gap-2">

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <PiDotsThreeBold className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>


                        <DropdownMenuContent align="end">


                            <DropdownMenuItem>
                                <TbUpload className="w-4 h-4" />
                                <span>导入</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem>
                                <TbDownload className="w-4 h-4" />
                                <span>导出</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>


                </div>
            </div>
        </div>
    );
}
