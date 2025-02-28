import { Workflow } from "../Workflow";
import { createContext, useContext, useRef } from "react";

interface EditorContextType {
  workflow: Workflow;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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

export const useEditorWorkflow = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error(
      "useEditorWorkflow must be used within EditorContextProvider",
    );
  }
  return context.workflow;
};
