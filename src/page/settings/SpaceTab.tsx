import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import { TbUpload, TbDownload } from "react-icons/tb";



export function SpaceTab() {



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
                                <span>新建环境变量</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <TbPlus className="w-4 h-4" />
                                <span>新建</span>
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
