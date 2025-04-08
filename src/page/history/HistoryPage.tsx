import { Agent, AgentStore } from "@/agent/Agent";
import { dialog } from "@/components/custom/DialogModal";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatHistory, Message } from "@/model/chat/Message";
import { MessageItem } from "@/model/types/chatModel";
import { ImageManager, ImagesStore } from "@/resources/Image";
import { Page } from "@/utils/PageRouter";
import { useEffect, useState } from "react";
import {
  TbClock,
  TbMessage,
  TbMessageCircle,
  TbPhoto,
  TbTrash,
} from "react-icons/tb";
import { ImageView } from "../main/ImageView";
import { CurrentTalkAgent } from "../main/MainView";
import { ChatMessageItem } from "../main/MessageItem";

export const HistoryPage = () => {
  const history = ChatHistory.use();
  const agents = AgentStore.use();
  const [tab, setTab] = useState<"message" | "image">("message");
  const images = ImagesStore.use();
  const [current, setCurrent] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<{
    id: string;
    agent?: string;
    system: MessageItem;
    list: MessageItem[];
  } | null>(null);

  useEffect(() => {
    if (current) {
      setSelectedHistory(history[current]);
    }
  }, [history, current]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="History"
        extra={
          <div>
            <Button
              onClick={() => {
                setTab("message");
              }}
              className={cn(tab === "message" && "bg-muted-foreground/10")}
            >
              <TbMessage className="h-4 w-4" />
              <span>History Message</span>
            </Button>
            <Button
              onClick={() => {
                setTab("image");
              }}
              className={cn(tab === "image" && "bg-muted-foreground/10")}
            >
              <TbPhoto className="h-4 w-4" />
              <span>Images Manager</span>
            </Button>
          </div>
        }
        close={() => {
          Page.to("main");
        }}
      />

      <div className="flex-1 overflow-hidden flex p-2">
        {tab === "image" && (
          <div className="flex flex-wrap gap-4 p-4">
            {Object.entries(images).map(([key, value]) => (
              <div
                key={key}
                className="relative group"
                onClick={() => {
                  setSelectedImage(key);
                }}
              >
                <img
                  src={value.base64Image}
                  alt="用户上传的图片"
                  className="w-20 h-20 object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    dialog.confirm({
                      title: "Delete Image",
                      content: "Are you sure you want to delete this image?",
                      onOk: () => {
                        ImageManager.deleteImage(key);
                      },
                    });
                  }}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/20 rounded-full"
                >
                  <TbTrash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <ImageView
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />
          </div>
        )}
        {tab === "message" && (
          <div className="h-full overflow-y-auto w-[300px] p-2 bg-muted/50 rounded-lg min-w-[300px] max-w-[300px] space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  Message.clearAll();
                }}
              >
                <TbTrash className="h-4 w-4" />
                delete all
              </Button>
            </div>

            {Object.entries(history)
              .sort(
                (a, b) =>
                  new Date(b[1].system.created_at).getTime() -
                  new Date(a[1].system.created_at).getTime(),
              )
              .map(([key, value]) => (
                <div
                  key={key}
                  onClick={() => {
                    setCurrent(key);
                  }}
                  className={cn(
                    "p-2 rounded-lg cursor-pointer transition-colors group",
                    "hover:bg-muted",
                    selectedHistory === value &&
                      "bg-muted-foreground/10 hover:bg-muted-foreground/20",
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TbClock className="h-4 w-4" />
                      <span className="text-xs">
                        {new Date(value.system.created_at).toLocaleString(
                          "zh-CN",
                          {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        Message.deleteHistory(key);
                      }}
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TbTrash className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="text-xs my-1 font-medium line-clamp-2 ">
                    {value.list[0]?.content}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TbMessageCircle className="h-3.5 w-3.5" />
                    <span>{value.list.length} messages</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === "message" && (
          <div className="flex-1 h-full overflow-y-auto">
            {selectedHistory ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">
                    {selectedHistory.agent &&
                      agents[selectedHistory.agent]?.name}
                  </h2>
                  <Button
                    onClick={async () => {
                      if (selectedHistory.agent) {
                        const agent = await Agent.get(selectedHistory.agent);
                        CurrentTalkAgent.set(agent, { replace: true });
                        await agent.engine.model.Message.switch(
                          selectedHistory.id,
                        );
                        Page.to("main");
                      }
                    }}
                    variant="outline"
                  >
                    continue
                  </Button>
                </div>
                <div>
                  <div
                    key={selectedHistory.id}
                    className="p-4 text-xs rounded-lg bg-primary/10"
                  >
                    {selectedHistory.system.content}
                  </div>
                  {selectedHistory.list.map((message, index) => (
                    <ChatMessageItem
                      key={selectedHistory.id + index}
                      message={message}
                      lastMessageType={selectedHistory.list[index - 1]?.role}
                      nextMessageType={selectedHistory.list[index + 1]?.role}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TbMessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view details</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
