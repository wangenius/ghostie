import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CronExpressionParser } from "cron-parser";
import { memo, useCallback, useEffect, useState } from "react";
import { TbInfoCircle } from "react-icons/tb";
import { Tickie } from "tickie";
import { Drawer } from "../ui/drawer";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Cron表达式格式说明：
 * ┌──────────── 秒 (0-59)
 * │ ┌────────── 分钟 (0-59)
 * │ │ ┌──────── 小时 (0-23)
 * │ │ │ ┌────── 日期 (1-31, L)
 * │ │ │ │ ┌──── 月份 (1-12)
 * │ │ │ │ │ ┌── 星期 (0-7, 0和7都表示周日, 1L-7L表示每月最后一个星期几)
 * │ │ │ │ │ │
 * * * * * * *
 *
 * 特殊字符说明：
 * * - 表示所有可能的值
 * / - 表示增量值，如 "0/15" 在分钟字段表示每隔15分钟
 * - - 表示范围，如 "1-5" 表示1到5
 * , - 表示列表值，如 "1,3,5" 表示1,3,5
 * L - 在日期字段表示月份的最后一天，在星期字段表示每月最后一个星期几
 * # - 在星期字段表示第几个星期几，如 "1#3" 表示第三个星期一
 * W - 在日期字段表示最接近指定日期的工作日
 */

// 常用表达式配置
const COMMON_EXPRESSIONS = [
  {
    label: "每分钟",
    value: "0 * * * * *",
    description: "每分钟执行一次",
  },
  {
    label: "每小时",
    value: "0 0 * * * *",
    description: "每小时执行一次",
  },
  {
    label: "每天上午9点",
    value: "0 0 9 * * *",
    description: "每天上午9点执行",
  },
  {
    label: "每周一上午9点",
    value: "0 0 9 * * 1",
    description: "每周一上午9点执行",
  },
  {
    label: "每周一至周五上午9点",
    value: "0 0 9 * * 1-5",
    description: "每周一至周五上午9点执行",
  },
  {
    label: "每月1日上午9点",
    value: "0 0 9 1 * *",
    description: "每月1日上午9点执行",
  },
  {
    label: "每月最后一天上午9点",
    value: "0 0 9 L * *",
    description: "每月最后一天上午9点执行",
  },
  {
    label: "每月最后一个周五上午9点",
    value: "0 0 9 * * 5L",
    description: "每月最后一个周五上午9点执行",
  },
];

// Cron字段配置
const CRON_FIELDS = [
  {
    name: "秒",
    placeholder: "0-59",
    options: [
      { value: "*", label: "每秒 (*)" },
      { value: "0", label: "0秒" },
      { value: "*/5", label: "每5秒" },
      { value: "*/10", label: "每10秒" },
      { value: "*/30", label: "每30秒" },
    ],
  },
  {
    name: "分钟",
    placeholder: "0-59",
    options: [
      { value: "*", label: "每分钟 (*)" },
      { value: "0", label: "0分" },
      { value: "*/5", label: "每5分钟" },
      { value: "*/10", label: "每10分钟" },
      { value: "*/15", label: "每15分钟" },
      { value: "*/30", label: "每30分钟" },
    ],
  },
  {
    name: "小时",
    placeholder: "0-23",
    options: [
      { value: "*", label: "每小时 (*)" },
      { value: "0", label: "0点" },
      { value: "9", label: "9点" },
      { value: "12", label: "12点" },
      { value: "18", label: "18点" },
      { value: "*/2", label: "每2小时" },
      { value: "*/4", label: "每4小时" },
      { value: "*/6", label: "每6小时" },
      { value: "*/12", label: "每12小时" },
    ],
  },
  {
    name: "日期",
    placeholder: "1-31",
    options: [
      { value: "*", label: "每日 (*)" },
      { value: "1", label: "1日" },
      { value: "15", label: "15日" },
      { value: "L", label: "最后一天 (L)" },
      { value: "1W", label: "最接近1日的工作日" },
      { value: "15W", label: "最接近15日的工作日" },
    ],
  },
  {
    name: "月份",
    placeholder: "1-12",
    options: [
      { value: "*", label: "每月 (*)" },
      { value: "1", label: "1月" },
      { value: "6", label: "6月" },
      { value: "12", label: "12月" },
      { value: "*/3", label: "每季度" },
      { value: "*/6", label: "每半年" },
    ],
  },
  {
    name: "星期",
    placeholder: "0-7",
    options: [
      { value: "*", label: "每星期 (*)" },
      { value: "0", label: "星期日" },
      { value: "1", label: "星期一" },
      { value: "5", label: "星期五" },
      { value: "1-5", label: "星期一至五" },
      { value: "1L", label: "本月最后一个星期一" },
      { value: "5L", label: "本月最后一个星期五" },
      { value: "1#1", label: "本月第一个星期一" },
      { value: "5#3", label: "本月第三个星期五" },
    ],
  },
];

const getScheduleDescription = (
  cronExpression: string,
): [string, string] | undefined => {
  if (!cronExpression) {
    return undefined;
  }

  try {
    // 获取系统时区
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const nextDate = Tickie.calculateNextRun(cronExpression);

    // 预定义的常见cron表达式模式
    const commonPatterns: Record<string, string> = {
      "* * * * * *": "每秒执行一次",
      "0 * * * * *": "每分钟执行一次",
      "0 0 * * * *": "每小时执行一次",
      "0 0 0 * * *": "每天凌晨执行",
      "0 0 0 * * 1": "每周一凌晨执行",
      "0 0 9 * * 1-5": "每周一至周五上午9点执行",
      "0 0 0 1 * *": "每月1日凌晨执行",
      "0 0 0 L * *": "每月最后一天凌晨执行",
      "0 0 0 * * 5L": "每月最后一个周五凌晨执行",
    };

    // 检查是否匹配常见模式
    if (commonPatterns[cronExpression]) {
      return [
        commonPatterns[cronExpression],
        formatNextRunTime(nextDate, timeZone),
      ];
    }

    // 解析 cron 表达式的各个部分
    const parts = cronExpression.split(" ");

    // 处理五位和六位cron表达式
    let second, minute, hour, dayOfMonth, month, dayOfWeek;

    if (parts.length === 6) {
      // 六位cron表达式（包含秒）
      [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    } else if (parts.length === 5) {
      // 五位cron表达式（不包含秒）
      second = "0";
      [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    } else {
      return ["无效的cron表达式", ""];
    }

    // 构建描述
    let description = "";

    // 处理特殊情况：最后一个星期几
    if (dayOfWeek.includes("L") && dayOfWeek !== "*") {
      description = getLastWeekdayDescription(second, minute, hour, dayOfWeek);
    }
    // 处理特殊情况：第n个星期几
    else if (dayOfWeek.includes("#") && dayOfWeek !== "*") {
      description = getNthWeekdayDescription(second, minute, hour, dayOfWeek);
    }
    // 处理其他情况
    else {
      const timeDesc = getTimeDescription(second, minute, hour);
      const dateDesc = getDateDescription(dayOfMonth, month, dayOfWeek);

      // 组合日期和时间描述
      if (dateDesc && timeDesc) {
        description = `${dateDesc}${timeDesc}`;
      } else if (dateDesc) {
        description = `${dateDesc}`;
      } else if (timeDesc) {
        description = `每天${timeDesc}`;
      } else {
        description = "执行时间未定义";
      }
    }

    return [description, formatNextRunTime(nextDate, timeZone)];
  } catch (err) {
    console.error("Parse cron expression error:", err);
    return ["无效的cron表达式", ""];
  }
};

// 格式化下次运行时间
const formatNextRunTime = (date: Date, timeZone: string): string => {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: timeZone,
  });
};

// 获取时间描述
const getTimeDescription = (
  second: string,
  minute: string,
  hour: string,
): string => {
  // Handle "Every second" case
  if (second === "*" && minute === "*" && hour === "*") {
    return "每秒执行";
  }

  // Handle minute intervals
  if (second === "0" && hour === "*") {
    if (minute.includes("/")) {
      const interval = minute.split("/")[1];
      return `每${interval}分钟执行`;
    }
    if (minute.includes("-")) {
      const [start, end] = minute.split("-");
      return `每小时的第${start}分钟到第${end}分钟执行`;
    }
    if (minute.includes(",")) {
      const minutes = minute
        .split(",")
        .map((m) => `${m}分钟`)
        .join(", ");
      return `每小时的第${minutes}执行`;
    }
    return minute === "0" ? "每小时整点执行" : `每小时的第${minute}分钟执行`;
  }

  // Handle hour ranges and intervals
  let hourDesc = "";
  if (hour.includes("-")) {
    const [start, end] = hour.split("-");
    hourDesc = `${start}点至${end}点`;
  } else if (hour.includes(",")) {
    const hours = hour
      .split(",")
      .map((h) => `${h}点`)
      .join(", ");
    hourDesc = `在${hours}`;
  } else if (hour.includes("/")) {
    const interval = hour.split("/")[1];
    hourDesc = `每${interval}小时`;
  } else if (hour !== "*") {
    hourDesc = `在${hour}点`;
  }

  // Handle seconds consistently
  let secondDesc = "";
  if (second === "0") {
    secondDesc = "";
  } else if (second.includes(",")) {
    const seconds = second
      .split(",")
      .map((s) => `${s}秒`)
      .join(", ");
    secondDesc = seconds;
  } else if (second.includes("/")) {
    const interval = second.split("/")[1];
    secondDesc = `每${interval}秒`;
  } else if (second !== "*") {
    secondDesc = `${second}秒`;
  }

  // Combine descriptions
  return [hourDesc, secondDesc].filter(Boolean).join(" ");
};

// 获取日期描述
const getDateDescription = (
  dayOfMonth: string,
  month: string,
  dayOfWeek: string,
): string => {
  const weekMap: Record<string, string> = {
    "0": "星期日",
    "1": "星期一",
    "2": "星期二",
    "3": "星期三",
    "4": "星期四",
    "5": "星期五",
    "6": "星期六",
    "7": "星期日",
  };

  // Handle day ranges
  if (dayOfMonth !== "*") {
    if (dayOfMonth === "L") {
      return "每月最后一天";
    }
    if (dayOfMonth.includes("-")) {
      const [start, end] = dayOfMonth.split("-");
      return `每月${start}日至${end}日`;
    }
    if (dayOfMonth.includes("W")) {
      const day = dayOfMonth.replace("W", "");
      return day === "1" ? "每月第一个工作日" : `每月${day}日附近的工作日`;
    }
    if (dayOfMonth.includes(",")) {
      const days = dayOfMonth
        .split(",")
        .map((d) => `${d}日`)
        .join(", ");
      return `每月${days}`;
    }
    if (dayOfMonth.includes("/")) {
      const interval = dayOfMonth.split("/")[1];
      return `每月每隔${interval}天`;
    }
    return `每月${dayOfMonth}日`;
  }

  // Handle weekdays
  if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-");
      return `每${weekMap[start]}至${weekMap[end]}`;
    } else if (dayOfWeek.includes(",")) {
      const weekdays = dayOfWeek
        .split(",")
        .map((d) => weekMap[d])
        .join(", ");
      return `每${weekdays}`;
    } else if (!dayOfWeek.includes("L") && !dayOfWeek.includes("#")) {
      return `每${weekMap[dayOfWeek]}`;
    }
  }

  // Handle month ranges and intervals
  if (month !== "*") {
    const monthNames = [
      "",
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];
    if (month.includes("-")) {
      const [start, end] = month.split("-");
      return `${monthNames[parseInt(start)]}至${monthNames[parseInt(end)]}`;
    }
    if (month.includes(",")) {
      const months = month
        .split(",")
        .map((m) => monthNames[parseInt(m)])
        .join(", ");
      return `在${months}`;
    }
    if (month.includes("/")) {
      const interval = month.split("/")[1];
      return `每隔${interval}个月`;
    }
    return `在${monthNames[parseInt(month)]}`;
  }

  return "";
};

// 获取最后一个星期几的描述
const getLastWeekdayDescription = (
  second: string,
  minute: string,
  hour: string,
  dayOfWeek: string,
): string => {
  const weekMap: Record<string, string> = {
    "0L": "星期日",
    "1L": "星期一",
    "2L": "星期二",
    "3L": "星期三",
    "4L": "星期四",
    "5L": "星期五",
    "6L": "星期六",
    "7L": "星期日",
    "0": "星期日",
    "1": "星期一",
    "2": "星期二",
    "3": "星期三",
    "4": "星期四",
    "5": "星期五",
    "6": "星期六",
    "7": "星期日",
  };

  const day = dayOfWeek.replace("L", "");
  let description = `每月最后一个${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += " 00:00:00";
  } else if (second === "0" && minute === "0") {
    description += ` ${hour}:00`;
  } else if (second === "0") {
    description += ` ${hour}:${minute}:00`;
  } else {
    description += ` ${hour}:${minute}:${second}`;
  }

  return description;
};

// 获取第n个星期几的描述
const getNthWeekdayDescription = (
  second: string,
  minute: string,
  hour: string,
  dayOfWeek: string,
): string => {
  const weekMap: Record<string, string> = {
    "0": "星期日",
    "1": "星期一",
    "2": "星期二",
    "3": "星期三",
    "4": "星期四",
    "5": "星期五",
    "6": "星期六",
    "7": "星期日",
  };

  const [day, nth] = dayOfWeek.split("#");
  const ordinals = ["", "第一个", "第二个", "第三个", "第四个", "第五个"];

  let description = `每月${ordinals[parseInt(nth)]}${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += " 00:00:00";
  } else if (second === "0" && minute === "0") {
    description += ` ${hour}:00`;
  } else if (second === "0") {
    description += ` ${hour}:${minute}:00`;
  } else {
    description += ` ${hour}:${minute}:${second}`;
  }

  return description;
};

export const CronInput = memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cronParts, setCronParts] = useState<string[]>([
      "0",
      "*",
      "*",
      "*",
      "*",
      "*",
    ]);

    // 初始化时解析传入的value
    useEffect(() => {
      if (value) {
        const parts = value.split(" ");
        if (parts.length === 6) {
          setCronParts(parts);
        } else if (parts.length === 5) {
          setCronParts(["0", ...parts]);
        }
      }
    }, []);

    // 验证 cron 表达式
    const validateCronExpression = useCallback(
      (expression: string): boolean => {
        try {
          CronExpressionParser.parse(expression);
          setError(null);
          return true;
        } catch (err) {
          setError(err instanceof Error ? err.message : "无效的cron表达式");
          return false;
        }
      },
      [],
    );

    // 更新某个字段的值
    const updateCronPart = useCallback(
      (index: number, value: string) => {
        const newParts = [...cronParts];
        newParts[index] = value;
        setCronParts(newParts);

        const newCronExpression = newParts.join(" ");
        if (validateCronExpression(newCronExpression)) {
          onChange(newCronExpression);
        }
      },
      [cronParts, onChange, validateCronExpression],
    );

    // 设置预定义表达式
    const setPresetExpression = useCallback(
      (expression: string) => {
        const parts = expression.split(" ");
        if (parts.length === 6) {
          setCronParts(parts);
          if (validateCronExpression(expression)) {
            onChange(expression);
          }
        }
      },
      [onChange, validateCronExpression],
    );

    const description = getScheduleDescription(cronParts.join(" "));

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-6 gap-2">
          {CRON_FIELDS.map((field, index) => (
            <div
              key={index}
              className="space-y-1 w-full flex flex-col justify-center"
            >
              <Label className="text-xs text-center">{field.name}</Label>
              <div className="flex flex-col space-y-1">
                <Select
                  value={cronParts[index]}
                  onValueChange={(value) => updateCronPart(index, value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={field.name} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={cronParts[index]}
                  onChange={(e) => updateCronPart(index, e.target.value)}
                  placeholder={field.placeholder}
                  className="font-mono h-9"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {description && (
          <div className="bg-muted-foreground/10 p-4 rounded-lg">
            <div className="border-primary/20 flex justify-between">
              <div className="flex flex-col flex-1">
                <span className="text-xs text-muted-foreground">执行规则</span>
                <p className="text-sm font-medium">{description[0]}</p>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs text-muted-foreground">
                  下次执行时间
                </span>
                <p className="text-sm font-medium">{description[1]}</p>
              </div>
            </div>
            <div
              onClick={() => setOpen(true)}
              className="flex items-center mt-4 gap-1.5 text-sm text-muted-foreground hover:cursor-pointer hover:text-primary hover:underline transition-colors rounded-md hover:bg-muted/50"
            >
              <TbInfoCircle className="h-4 w-4" />
              <span>Cron文档</span>
            </div>
          </div>
        )}

        <Drawer open={open} onOpenChange={setOpen} className="w-[400px]">
          <div className={cn("space-y-3", open ? "block" : "hidden")}>
            <div>
              <h4 className="font-medium text-foreground mb-2">
                Cron表达式格式
              </h4>
              <ul className="text-xs text-muted-foreground">
                <li>
                  <span className="font-bold">1</span> = 秒 (0-59)
                </li>
                <li>
                  <span className="font-bold">2</span> = 分钟 (0-59)
                </li>
                <li>
                  <span className="font-bold">3</span> = 小时 (0-23)
                </li>
                <li>
                  <span className="font-bold">4</span> = 日期 (1-31,
                  L)(L表示月份的最后一天)
                </li>
                <li>
                  <span className="font-bold">5</span> = 月份 (1-12)
                </li>
                <li>
                  <span className="font-bold">6</span> = 星期 (0-7) (0,7
                  表示星期日)(可选)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">特殊字符说明</h4>
              <div>
                {[
                  { char: "*", desc: "表示所有可能的值" },
                  {
                    char: "?",
                    desc: "表示未指定值（与*相同）",
                  },
                  {
                    char: ",",
                    desc: "表示多个值，例如 1,3,5",
                  },
                  { char: "-", desc: "表示一个范围，例如 1-5" },
                  { char: "/", desc: "表示一个间隔，例如 */5" },
                  {
                    char: "L",
                    desc: "表示最后，例如 5L表示最后一个星期五",
                  },
                  {
                    char: "#",
                    desc: "表示第几个，例如 6#3表示第三个星期六",
                  },
                  { char: "W", desc: "表示最接近指定日期的工作日" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-1 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-md font-mono font-bold">
                      {item.char}
                    </div>
                    <div className="text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">常用表达式</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {COMMON_EXPRESSIONS.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/5 hover:cursor-pointer transition-colors group"
                    onClick={() => {
                      setPresetExpression(item.value);
                    }}
                  >
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded-md">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium group-hover:text-primary transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Drawer>
      </div>
    );
  },
);
