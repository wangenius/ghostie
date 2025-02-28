import { TbLoader2 } from "react-icons/tb";

export const LoadingSpin = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <TbLoader2 className="w-8 h-8 animate-spin" />
    </div>
  );
};
