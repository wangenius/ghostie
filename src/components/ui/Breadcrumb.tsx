import React, { forwardRef, Fragment, ReactNode } from "react";

// BreadcrumbProps: 主Breadcrumb组件的属性
interface BreadcrumbProps {
  separator?: ReactNode;
  maxCount?: number;
  children: ReactNode;
}

// BreadcrumbItemProps: 子Item组件的属性
interface BreadcrumbItemProps {
  children: ReactNode;
}

// Breadcrumb.Item组件：渲染每个Breadcrumb项
const BreadcrumbItem = forwardRef<HTMLSpanElement, BreadcrumbItemProps>(
  ({ children }, ref) => {
    return (
      <span
        className="text-s cursor-pointer hover:bg-base-300 py-1 px-3 rounded-full"
        ref={ref}
      >
        {children}
      </span>
    );
  },
);

// Breadcrumb组件：渲染整个Breadcrumb
export const Breadcrumb: React.FC<BreadcrumbProps> & {
  Item: typeof BreadcrumbItem;
} = ({ separator = "/", maxCount = 5, children }) => {
  const items = React.Children.toArray(children);
  const itemCount = items.length;

  // 如果items长度大于maxCount，显示部分Breadcrumb项和省略号
  const displayedItems =
    itemCount > maxCount
      ? [
          items[0], // 显示第一个
          <BreadcrumbItem key="ellipsis">...</BreadcrumbItem>, // 省略号
          ...items.slice(itemCount - (maxCount - 2), itemCount), // 显示最后几个
        ]
      : items;

  return (
    <Fragment>
      {displayedItems.map((item, index) => (
        <React.Fragment key={index}>
          {item}
          {index < displayedItems.length - 1 && <span>{separator}</span>}
        </React.Fragment>
      ))}
    </Fragment>
  );
};

// 为Breadcrumb组件添加Item子组件
Breadcrumb.Item = BreadcrumbItem;
