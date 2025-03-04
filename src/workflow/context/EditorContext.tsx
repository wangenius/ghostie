import { Workflow } from "../Workflow";
import { createContext, useContext, useEffect, useRef } from "react";

interface EditorContextType {
  workflow: Workflow;
}

const EditorContext = createContext<EditorContextType | null>(null);

/** 工作流编辑器上下文提供者 */
export const EditorContextProvider = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  /** 工作流实例 */
  const workflowRef = useRef<Workflow>(new Workflow());

  useEffect(() => {
    const initWorkflow = async () => {
      try {
        if (id) {
          // 使用新的工作流实例，避免状态混淆
          workflowRef.current = await Workflow.create(id);
        } else {
          workflowRef.current = await Workflow.create();
        }
        console.log(`正在编辑工作流 ${id}`);
      } catch (error) {
        console.error(`加载工作流 ${id} 失败:`, error);
      }
    };
    initWorkflow();
  }, [id]);

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
    throw Promise.reject(
      new Error("useEditorWorkflow must be used within EditorContextProvider"),
    );
  }
  return context.workflow;
};
