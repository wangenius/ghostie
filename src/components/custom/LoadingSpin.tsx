import { TbLoader2 } from "react-icons/tb";
import { cn } from "@/lib/utils";

interface LoadingSpinProps {
  className?: string;
  size?: number;
}

export const LoadingSpin = ({ className, size = 32 }: LoadingSpinProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <TbLoader2
        className="animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  );
};
