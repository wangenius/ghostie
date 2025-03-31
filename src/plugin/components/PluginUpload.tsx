import { PluginProps } from "@/common/types/plugin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cmd } from "@/utils/shell";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { TbLoader2, TbUpload } from "react-icons/tb";
import { PluginManager } from "../PluginManager";

const supabase = createClient(
  "https://iwuvrfojrkclhcxfcjzy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8",
);

export const PluginUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginProps | null>(
    null,
  );
  const [pluginContent, setPluginContent] = useState<string>("");
  const [author, setAuthor] = useState("");
  const plugins = Object.values(PluginManager.use());

  useEffect(() => {
    if (selectedPlugin) {
      cmd
        .invoke<{ content: string }>("plugin_get", { id: selectedPlugin.id })
        .then((res) => {
          setPluginContent(res.content);
        })
        .catch((error) => {
          console.error("failed to load plugin content:", error);
          cmd.message("failed to load plugin content", "error");
        });
    }
  }, [selectedPlugin]);

  const handleUpload = async () => {
    if (!selectedPlugin || !author.trim()) {
      cmd.message("please fill in the author information", "error");
      return;
    }

    try {
      setUploading(true);
      const { error } = await supabase.from("plugins").insert({
        name: selectedPlugin.name,
        description: selectedPlugin.description || "",
        version: selectedPlugin.version || "1.0.0",
        author: author.trim(),
        content: pluginContent,
      });

      if (error) {
        throw error;
      }

      cmd.message(
        "plugin uploaded successfully, waiting for review",
        "success",
      );
      setSelectedPlugin(null);
      setAuthor("");
    } catch (error) {
      console.error("failed to upload plugin:", error);
      cmd.message(
        `failed to upload plugin: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full h-full p-6 flex flex-col">
        <div className="flex mb-6">
          <div className="space-y-2 flex-1">
            <h2 className="text-lg font-semibold">upload plugin</h2>
            <p className="text-sm text-muted-foreground">
              select the plugin to upload, the system will automatically get the
              plugin content and submit for review
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedPlugin || uploading || !author.trim()}
          >
            {uploading ? (
              <>
                <TbLoader2 className="w-4 h-4 mr-2 animate-spin" />
                uploading...
              </>
            ) : (
              <>
                <TbUpload className="w-4 h-4 mr-2" />
                upload plugin
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 flex flex-col space-y-4">
          <Select
            value={selectedPlugin?.id}
            onValueChange={(value) => {
              const plugin = plugins.find((p) => p.id === value);
              setSelectedPlugin(plugin || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="select plugin" />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[300px]">
                {plugins.map((plugin) => (
                  <SelectItem key={plugin.id} value={plugin.id}>
                    <div className="flex items-center gap-2">
                      <span>{plugin.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {plugin.version || "1.0.0"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label htmlFor="author">author</Label>
            <Input
              id="author"
              placeholder="please input author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div>
            {selectedPlugin && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <h3 className="font-medium">{selectedPlugin.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlugin.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">tools count:</span>
                    {selectedPlugin.tools.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
