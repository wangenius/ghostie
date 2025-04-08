import { Agent, AgentStore } from "@/agent/Agent";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { ImageElement } from "@/components/editor/elements/image";
import { Button } from "@/components/ui/button";
import { ChatHistory } from "@/model/chat/Message";
import { Page } from "@/utils/PageRouter";
import { LogicalSize, Window } from "@tauri-apps/api/window";
import { Echoa } from "echo-state";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbCapture,
  TbDatabase,
  TbDeviceAudioTape,
  TbHistory,
  TbPhoto,
  TbScript,
  TbSettings,
  TbShape3,
  TbSquareRoundedLetterL,
} from "react-icons/tb";
import { Descendant } from "slate";
import { ChatMessageItem } from "./MessageItem";
import { TypeArea } from "./TypeArea";
import { Popover } from "@radix-ui/react-popover";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// 定义 MentionElement 接口
interface MentionElement {
  type: "mention";
  id: string;
  children: { text: string }[];
}

export const plainText = (value: Descendant[]) =>
  value
    .map((node) => {
      // 处理普通文本节点
      if (!("type" in node)) {
        return node.text;
      }

      // 跳过mention节点
      if (node.type === "mention") {
        return "";
      }

      // 处理包含子节点的节点
      if ("children" in node) {
        return node.children
          .filter((child) => !("type" in child) || child.type !== "mention")
          .map((child) => ("text" in child ? child.text : ""))
          .join("");
      }

      return "";
    })
    .join("")
    .trim();

/* 当前对话的agent */
export const CurrentTalkAgent = new Echoa<Agent>(new Agent());

/* 主界面 */
export function MainView() {
  const agent = CurrentTalkAgent.use();
  const [errorInfo, setErrorInfo] = useState<string>("");
  const props = AgentStore.use((selector) => selector[agent.props.id]);
  const list = ChatHistory.use();
  const [loading, setLoading] = useState(false);
  const message = list[agent.engine.model?.Message.id];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ focus: () => void }>(null);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [
        {
          text: "",
        },
      ],
    },
  ]);

  // 当消息更新时滚动到底部
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [list]);

  useEffect(() => {
    if (props?.id) {
      Window.getByLabel("main").then((window) => {
        window?.setSize(new LogicalSize(600, 800));
        window?.center();
      });
    } else {
      Window.getByLabel("main").then((window) => {
        window?.setSize(new LogicalSize(600, 200));
        window?.center();
      });
    }
  }, [props]);

  const handleSettingsClick = useCallback(() => {
    Page.to("settings");
  }, []);

  const handleHistoryClick = useCallback(() => {
    Page.to("history");
  }, []);

  const handleActionClick = useCallback(() => {
    if (agent.props.id) {
      if (loading) {
        agent.stop();
      } else {
        CurrentTalkAgent.set(new Agent(), { replace: true });
      }
    }
  }, [loading, agent]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        Page.to("history");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleActionClick();
      }
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        Page.to("settings");
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleActionClick]);

  const handleSubmit = useCallback(
    async (value: Descendant[]) => {
      console.log(value);

      if (loading) {
        agent.stop();
        return;
      }

      // 提取所有 mention 元素和图片元素
      const mentions: { id: string; text: string }[] = [];
      const images: { contentType: string; base64Image: string }[] = [];

      // 遍历所有节点寻找 mention 和 image 类型的元素
      const extractElements = (nodes: Descendant[]) => {
        for (const node of nodes) {
          // 判断节点是否为 mention 类型
          if ("type" in node) {
            if (node.type === "mention" && "id" in node) {
              const mentionNode = node as MentionElement;
              mentions.push({
                id: mentionNode.id,
                text: mentionNode.children[0].text,
              });
            } else if (node.type === "image") {
              const imageNode = node as ImageElement;
              images.push({
                contentType: imageNode.contentType,
                base64Image: imageNode.base64Image,
              });
            }
          }

          // 递归遍历子节点
          if ("children" in node && Array.isArray(node.children)) {
            extractElements(node.children);
          }
        }
      };

      extractElements(value);
      console.log(mentions, images, props);

      if (mentions.length === 0 && !props?.id) {
        setErrorInfo("please select agent first");
      }

      // 如果有提取到 mention，进行处理
      if (mentions.length > 1) {
        setErrorInfo("current version only support one agent call");
      }

      if (props?.id) {
        setErrorInfo("");
        setValue([
          {
            type: "paragraph",
            children: [{ text: "" }],
          },
        ]);
        setLoading(true);
        await CurrentTalkAgent.current.chat(plainText(value), { images });
        setLoading(false);
      } else {
        const agent = await Agent.get(mentions[0].id);
        CurrentTalkAgent.set(agent, { replace: true });
        setErrorInfo("");
        setValue([
          {
            type: "paragraph",
            children: [{ text: "" }],
          },
        ]);
        setLoading(true);
        await agent.chat(plainText(value), { images });
        setLoading(false);
      }
    },
    [props, agent, loading],
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="px-1.5 draggable">
        <div className="mx-auto flex items-center justify-between h-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="no-drag rounded-full">
              <LogoIcon className="w-4 h-4" />
              {props?.name || "Ghostie"}
            </Button>

            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              {props?.models?.text?.name && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="text model"
                >
                  <TbSquareRoundedLetterL className="w-4 h-4" />
                </Button>
              )}
              {props?.models?.image?.name && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="image model"
                >
                  <TbPhoto className="w-4 h-4" />
                </Button>
              )}
              {props?.models?.vision?.name && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="vision model"
                >
                  <TbCapture className="w-4 h-4" />
                </Button>
              )}
              {props?.models?.audio?.name && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="audio model"
                >
                  <TbDeviceAudioTape className="w-4 h-4" />
                </Button>
              )}
              {props?.tools?.length > 0 && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="tool"
                >
                  <TbScript className="w-4 h-4" />
                </Button>
              )}
              {props?.workflows?.length > 0 && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="workflow"
                >
                  <TbShape3 className="w-4 h-4" />
                </Button>
              )}
              {props?.knowledges?.length > 0 && (
                <Button
                  variant="ghost"
                  className="rounded-[8px]"
                  size="icon"
                  title="knowledge"
                >
                  <TbDatabase className="w-4 h-4" />
                </Button>
              )}
            </span>
            <small className="text-yellow-600">{errorInfo}</small>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              size={"icon"}
              className="rounded-[8px]"
              onClick={handleHistoryClick}
            >
              <TbHistory className="h-4 w-4" />
            </Button>
            <Button
              size={"icon"}
              className="rounded-[8px]"
              onClick={handleSettingsClick}
            >
              <TbSettings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <main className="flex-1 overflow-hidden flex flex-col justify-between">
        {props?.id && (
          <div
            ref={messagesContainerRef}
            className="px-4 w-full overflow-y-auto flex-1"
          >
            {message?.list.map((msg, index) => (
              <ChatMessageItem
                key={props.id + index}
                message={msg}
                lastMessageType={message?.list[index - 1]?.role}
                nextMessageType={message?.list[index + 1]?.role}
              />
            ))}
            <div className="h-4" ref={messagesEndRef} />
          </div>
        )}
        <TypeArea
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          editorRef={editorRef}
          currentAgent={props?.id}
          loading={loading}
        />
      </main>
    </div>
  );
}
