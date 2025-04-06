import { Agent, AgentStore } from "@/agent/Agent";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatHistory } from "@/model/chat/Message";
import { Page } from "@/utils/PageRouter";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { LogicalSize, Window } from "@tauri-apps/api/window";
import { Echoa } from "echo-state";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbCornerRightUp,
  TbHistory,
  TbLoader,
  TbSettings,
} from "react-icons/tb";
import { Descendant } from "slate";
import { ChatMessageItem } from "./components/MessageItem";
import { TypeArea } from "./components/TypeArea";
// 定义 MentionElement 接口
interface MentionElement {
  type: "mention";
  id: string;
  children: { text: string }[];
}

const plainText = (value: Descendant[]) =>
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
        window?.setSize(new LogicalSize(600, 160));
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

      // 提取所有 mention 元素
      const mentions: { id: string; text: string }[] = [];

      // 遍历所有节点寻找 mention 类型的元素
      const extractMentions = (nodes: Descendant[]) => {
        for (const node of nodes) {
          // 判断节点是否为 mention 类型
          if ("type" in node && node.type === "mention" && "id" in node) {
            const mentionNode = node as MentionElement;
            mentions.push({
              id: mentionNode.id,
              text: mentionNode.children[0].text,
            });
          }

          // 递归遍历子节点
          if ("children" in node && Array.isArray(node.children)) {
            extractMentions(node.children);
          }
        }
      };

      extractMentions(value);
      console.log(mentions, props);

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
        await CurrentTalkAgent.current.chat(plainText(value));
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
        await agent.chat(plainText(value));
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
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                className="no-drag rounded-[8px] cursor-pointer"
              >
                <Button variant="ghost" className="no-drag rounded-full">
                  <LogoIcon className="w-4 h-4" />
                  {props?.name || "Ghostie"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={handleHistoryClick}
                >
                  <TbHistory className="h-4 w-4" />
                  History
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={handleSettingsClick}
                >
                  <TbSettings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <small className="text-yellow-600">{errorInfo}</small>
          </div>

          <Button
            onClick={() => handleSubmit(value)}
            variant={
              !props?.id && plainText(value).trim() === "" ? "ghost" : "default"
            }
            className={cn(
              "no-drag",
              !props?.id &&
                plainText(value).trim() === "" &&
                "opacity-50 hover:bg-transparent cursor-default hover:opacity-50",
            )}
          >
            {loading ? "stop" : "OK"}
            {loading ? (
              <TbLoader className="w-4 h-4 animate-spin" />
            ) : (
              <TbCornerRightUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      <main className="flex-1 overflow-hidden flex flex-col justify-between">
        {props?.id && (
          <div
            ref={messagesContainerRef}
            className="px-4 w-full space-y-2 overflow-y-auto"
          >
            {message?.list.map((message, index) => (
              <ChatMessageItem key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        <TypeArea
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          className={
            props?.id
              ? "bg-background pt-3 min-h-[120px] max-h-[120px] shadow-top"
              : ""
          }
        />
      </main>
    </div>
  );
}
