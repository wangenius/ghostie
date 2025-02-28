import { Workflow } from "../Workflow";
import { createContext, useContext, useRef } from "react";

interface EditorContextType {
  workflow: Workflow;
}

const EditorContext = createContext<EditorContextType | null>(null);

/** 工作流编辑器上下文提供者 */
export const EditorContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  /** 工作流实例 */
  const workflowRef = useRef<Workflow>();
  if (!workflowRef.current) {
    workflowRef.current = new Workflow();
  }

  return (
    <EditorContext.Provider value={{ workflow: workflowRef.current }}>
      {children}
    </EditorContext.Provider>
  );
};

/** 使用工作流编辑器上下文
 * @description 使用工作流编辑器上下文，获取工作流实例
 * 返回的是编辑器环境中的工作流实例
 */
export const useEditorWorkflow = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error(
      "useEditorWorkflow must be used within EditorContextProvider",
    );
  }
  return context.workflow;
};
