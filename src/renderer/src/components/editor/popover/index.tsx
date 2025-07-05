import {createPortal} from "react-dom";
import {ReactNode} from "react";

export const Portal = ({ children }: { children?: ReactNode }) => {
  return typeof document === 'object'
      ? createPortal(children, document.body)
      : null
}
