import { PluginProps } from "@/common/types/plugin";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JsonViewer from "@/components/custom/JsonViewer";
import { TbLoader2 } from "react-icons/tb";
import { ParamInput } from "./ParamInput";

interface TestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlugin?: PluginProps;
  testTool: string;
  testArgs: Record<string, unknown>;
  result: any;
  isSubmitting: boolean;
  onTestToolChange: (value: string) => void;
  onTestArgsChange: (args: Record<string, unknown>) => void;
  onTest: (tool: string) => void;
}

export function TestDrawer({
  open,
  onOpenChange,
  selectedPlugin,
  testTool,
  testArgs,
  result,
  isSubmitting,
  onTestToolChange,
  onTestArgsChange,
  onTest,
}: TestDrawerProps) {
  const parameters = selectedPlugin?.tools.find(
    (tool) => tool.name === testTool,
  )?.parameters;

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={onOpenChange}
      className="w-[380px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">测试工具</h3>
              <p className="text-sm text-muted-foreground mb-3">
                选择要测试的工具并配置相关参数
              </p>
              <Select value={testTool} onValueChange={onTestToolChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择测试工具" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlugin?.tools.map((tool) => (
                    <SelectItem key={tool.name} value={tool.name}>
                      {tool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {testTool && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  测试参数配置
                </h4>
                <div className="space-y-4">
                  {parameters &&
                    Object.entries(parameters.properties || {}).map(
                      ([key, property]) => (
                        <div key={key} className="bg-background rounded-md p-3">
                          <ParamInput
                            name={key}
                            property={property}
                            value={testArgs[key]}
                            onChange={(value) =>
                              onTestArgsChange({
                                ...testArgs,
                                [key]: value,
                              })
                            }
                          />
                        </div>
                      ),
                    )}
                </div>
              </div>
            )}

            {result && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  测试结果
                </h4>
                <JsonViewer data={result} />
              </div>
            )}
          </div>
        </div>

        <Button
          disabled={!testTool}
          onClick={() => onTest(testTool)}
          className="w-full h-11 text-base font-medium"
          variant="default"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <TbLoader2 className="w-4 h-4 animate-spin" />
              测试运行中...
            </span>
          ) : (
            "运行测试"
          )}
        </Button>
      </div>
    </Drawer>
  );
}
