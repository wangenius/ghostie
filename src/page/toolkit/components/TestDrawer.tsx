import { ToolkitProps } from "@/toolkit/types";
import JsonViewer from "@/components/custom/JsonViewer";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TbLoader2, TbPlayerPlay } from "react-icons/tb";
import { ParamInput } from "./ParamInput";
import { CustomSelect } from "@/components/ui/custom-select";

interface TestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlugin?: ToolkitProps;
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
      className="w-[480px]"
      title={
        <div className="p-2 w-full">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">{selectedPlugin?.name}</h3>{" "}
            <Button
              disabled={!testTool || isSubmitting}
              onClick={() => onTest(testTool)}
              variant="default"
              size="sm"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <TbLoader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <TbPlayerPlay className="w-3.5 h-3.5" />
                  Run Test
                </span>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedPlugin?.description}
          </p>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-4">
          <CustomSelect
            value={testTool}
            onValueChange={onTestToolChange}
            options={
              selectedPlugin?.tools.map((tool) => ({
                value: tool.name,
                label: tool.name,
                description: tool.description,
              })) || []
            }
            placeholder="Select Tool"
          />

          {testTool && parameters && (
            <div className="bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                Test Parameter Configuration
              </h4>
              <div className="space-y-1">
                {parameters &&
                  Object.entries(parameters.properties || {}).map(
                    ([key, property]) => (
                      <ParamInput
                        name={key}
                        key={key}
                        property={property}
                        value={testArgs[key]}
                        onChange={(value) =>
                          onTestArgsChange({
                            ...testArgs,
                            [key]: value,
                          })
                        }
                      />
                    ),
                  )}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                Test Result
              </h4>
              <JsonViewer data={result} />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
