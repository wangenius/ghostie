import { BotManager } from "@/bot/BotManger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/utils/supabase";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbLoader2, TbUpload } from "react-icons/tb";

export function BotUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");

  const bots = BotManager.use();

  // 上传机器人
  const handleUpload = async () => {
    if (!selectedBotId || !author || !description) return;

    try {
      setIsUploading(true);
      const bot = bots[selectedBotId];

      // 上传到 Supabase
      const { error } = await supabase.from("bots").insert({
        name: bot.name,
        system: bot.system,
        author: author,
        description: description,
      });

      if (error) throw error;

      cmd.message("Successfully uploaded bot to market", "success");
      cmd.invoke("close_modal");
    } catch (error) {
      console.error("Upload bot failed:", error);
      cmd.message(
        `Upload bot failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 p-3">
        <div>
          <Select value={selectedBotId || ""} onValueChange={setSelectedBotId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Bot..." />
            </SelectTrigger>
            <SelectContent>
              {Object.values(bots).map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="type your name"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="type your description"
        />
        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            className="px-4 py-2 h-10"
            onClick={handleUpload}
            disabled={isUploading || !selectedBotId || !author || !description}
          >
            {isUploading ? (
              <>
                <TbLoader2 className="mr-2 h-4 w-4 animate-spin" />
                submitting...
              </>
            ) : (
              <>
                <TbUpload className="mr-2 h-4 w-4" />
                submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
