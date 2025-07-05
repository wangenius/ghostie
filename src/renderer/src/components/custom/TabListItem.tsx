import { ReactNode } from "react";

export const TabListItem = (provider: {
  icon?: ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex items-center justify-between gap-2 min-h-8">
      {provider.icon}
      <div className="flex flex-col items-start justify-start flex-1 gap-1">
        <span className="font-bold text-sm truncate">{provider.title}</span>
        <span className="text-xs text-muted-foreground line-clamp-1">
          {provider.description}
        </span>
      </div>
    </div>
  );
};
