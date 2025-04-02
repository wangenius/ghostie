import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CronExpressionParser } from "cron-parser";
import { memo, useCallback, useState } from "react";
import { TbInfoCircle } from "react-icons/tb";
import { Tickie } from "tickie";

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
    label: "Every minute",
    value: "0 * * * * *",
    description: "Every minute",
  },
  {
    label: "Every hour",
    value: "0 0 * * * *",
    description: "Every hour",
  },
  {
    label: "Every day at 9:00",
    value: "0 0 9 * * *",
    description: "Every day at 9:00",
  },
  {
    label: "Every Monday at 9:00",
    value: "0 0 9 * * 1",
    description: "Every Monday at 9:00",
  },
  {
    label: "Every Monday to Friday at 9:00",
    value: "0 0 9 * * 1-5",
    description: "Every Monday to Friday at 9:00",
  },
  {
    label: "Every first day of the month at 9:00",
    value: "0 0 9 1 * *",
    description: "Every first day of the month at 9:00",
  },
  {
    label: "Every last day of the month at 9:00",
    value: "0 0 9 L * *",
    description: "Every last day of the month at 9:00",
  },
  {
    label: "Every last Friday of the month at 9:00",
    value: "0 0 9 * * 5L",
    description: "Every last Friday of the month at 9:00",
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
      "* * * * * *": "Every second",
      "0 * * * * *": "Every minute",
      "0 0 * * * *": "Every hour",
      "0 0 0 * * *": "Every day at midnight",
      "0 0 0 * * 1": "Every Monday at midnight",
      "0 0 9 * * 1-5": "Every Monday to Friday at 9:00",
      "0 0 0 1 * *": "Every first day of the month at midnight",
      "0 0 0 L * *": "Every last day of the month at midnight",
      "0 0 0 * * 5L": "Every last Friday of the month at midnight",
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
      return ["Invalid cron expression", ""];
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
        description = `Every day at ${timeDesc}`;
      } else {
        description = "Execution time not defined";
      }
    }

    return [description, formatNextRunTime(nextDate, timeZone)];
  } catch (err) {
    console.error("Parse cron expression error:", err);
    return ["Invalid cron expression", ""];
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
    return "Every second";
  }

  // Handle minute intervals
  if (second === "0" && hour === "*") {
    if (minute.includes("/")) {
      const interval = minute.split("/")[1];
      return `Every ${interval} minutes`;
    }
    if (minute.includes("-")) {
      const [start, end] = minute.split("-");
      return `Every minute from ${start} to ${end}`;
    }
    if (minute.includes(",")) {
      const minutes = minute
        .split(",")
        .map((m) => `${m} minutes`)
        .join(", ");
      return `Every hour at ${minutes}`;
    }
    return minute === "0" ? "Every hour" : `Every hour at ${minute} minutes`;
  }

  // Handle hour ranges and intervals
  let hourDesc = "";
  if (hour.includes("-")) {
    const [start, end] = hour.split("-");
    hourDesc = `from ${start}:00 to ${end}:00`;
  } else if (hour.includes(",")) {
    const hours = hour
      .split(",")
      .map((h) => `${h}:00`)
      .join(", ");
    hourDesc = `at ${hours}`;
  } else if (hour.includes("/")) {
    const interval = hour.split("/")[1];
    hourDesc = `every ${interval} hours`;
  } else if (hour !== "*") {
    hourDesc = `at ${hour}:00`;
  }

  // Handle seconds consistently
  let secondDesc = "";
  if (second === "0") {
    secondDesc = "";
  } else if (second.includes(",")) {
    const seconds = second
      .split(",")
      .map((s) => `${s} seconds`)
      .join(", ");
    secondDesc = seconds;
  } else if (second.includes("/")) {
    const interval = second.split("/")[1];
    secondDesc = `every ${interval} seconds`;
  } else if (second !== "*") {
    secondDesc = `${second} seconds`;
  }

  // Combine descriptions
  return [hourDesc, secondDesc].filter(Boolean).join(" ");
};

// Helper function for ordinal suffixes
const getOrdinalSuffix = (n: string): string => {
  const num = parseInt(n);
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// 获取日期描述
const getDateDescription = (
  dayOfMonth: string,
  month: string,
  dayOfWeek: string,
): string => {
  const weekMap: Record<string, string> = {
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "7": "Sunday",
  };

  // Handle day ranges
  if (dayOfMonth !== "*") {
    if (dayOfMonth === "L") {
      return "On the last day of the month";
    }
    if (dayOfMonth.includes("-")) {
      const [start, end] = dayOfMonth.split("-");
      return `From the ${start}${getOrdinalSuffix(
        start,
      )} to the ${end}${getOrdinalSuffix(end)} day of the month`;
    }
    if (dayOfMonth.includes("W")) {
      const day = dayOfMonth.replace("W", "");
      return day === "1"
        ? "On the first working day of the month"
        : `On the ${day}${getOrdinalSuffix(day)} working day of the month`;
    }
    if (dayOfMonth.includes(",")) {
      const days = dayOfMonth
        .split(",")
        .map((d) => `${d}${getOrdinalSuffix(d)}`)
        .join(", ");
      return `On the ${days} day of the month`;
    }
    if (dayOfMonth.includes("/")) {
      const interval = dayOfMonth.split("/")[1];
      return `Every ${interval} days of the month`;
    }
    return `On the ${dayOfMonth}${getOrdinalSuffix(
      dayOfMonth,
    )} day of the month`;
  }

  // Handle weekdays
  if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-");
      return `Every ${weekMap[start]} to ${weekMap[end]}`;
    } else if (dayOfWeek.includes(",")) {
      const weekdays = dayOfWeek
        .split(",")
        .map((d) => weekMap[d])
        .join(", ");
      return `Every ${weekdays}`;
    } else if (!dayOfWeek.includes("L") && !dayOfWeek.includes("#")) {
      return `Every ${weekMap[dayOfWeek]}`;
    }
  }

  // Handle month ranges and intervals
  if (month !== "*") {
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    if (month.includes("-")) {
      const [start, end] = month.split("-");
      return `From ${monthNames[parseInt(start)]} to ${
        monthNames[parseInt(end)]
      }`;
    }
    if (month.includes(",")) {
      const months = month
        .split(",")
        .map((m) => monthNames[parseInt(m)])
        .join(", ");
      return `In ${months}`;
    }
    if (month.includes("/")) {
      const interval = month.split("/")[1];
      return `Every ${interval} months`;
    }
    return `In ${monthNames[parseInt(month)]}`;
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
    "0L": "Sunday",
    "1L": "Monday",
    "2L": "Tuesday",
    "3L": "Wednesday",
    "4L": "Thursday",
    "5L": "Friday",
    "6L": "Saturday",
    "7L": "Sunday",
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "7": "Sunday",
  };

  const day = dayOfWeek.replace("L", "");
  let description = `Every last ${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += "at 00:00:00";
  } else if (second === "0" && minute === "0") {
    description += `at ${hour}:00`;
  } else if (second === "0") {
    description += `at ${hour}:${minute}:00`;
  } else {
    description += `at ${hour}:${minute}:${second}`;
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
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "7": "Sunday",
  };

  const [day, nth] = dayOfWeek.split("#");
  const ordinals = ["", "first", "second", "third", "fourth", "fifth"];

  let description = `Every ${ordinals[parseInt(nth)]} ${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += "at 00:00:00";
  } else if (second === "0" && minute === "0") {
    description += `at ${hour}:00`;
  } else if (second === "0") {
    description += `at ${hour}:${minute}:00`;
  } else {
    description += `at ${hour}:${minute}:${second}`;
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
    const [customExpression, setCustomExpression] = useState(value || "");
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    // 验证 cron 表达式
    const validateCronExpression = useCallback(
      (expression: string): boolean => {
        try {
          CronExpressionParser.parse(expression);
          setError(null);
          return true;
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Invalid cron expression",
          );
          return false;
        }
      },
      [],
    );

    // 处理自定义表达式变更
    const handleCustomExpressionChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setCustomExpression(newValue);
        if (validateCronExpression(newValue)) {
          onChange(newValue);
        }
      },
      [onChange, validateCronExpression],
    );

    const description = getScheduleDescription(customExpression);

    return (
      <div className="space-y-2">
        <div className="space-y-2">
          <Input
            value={customExpression}
            onChange={handleCustomExpressionChange}
            placeholder="Enter cron expression, e.g. 0 0 0 * * *"
            className="font-mono"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        {description && (
          <div className="bg-muted-foreground/10 p-4 rounded-lg">
            <div className="space-y-2 border-primary/20">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Execution rule
                </span>
                <p className="text-sm font-medium">{description[0]}</p>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Next execution time
                </span>
                <p className="text-sm font-medium">{description[1]}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted text-xs text-muted-foreground space-y-4 p-3 rounded-lg">
          <div
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:cursor-pointer hover:text-primary hover:underline transition-colors rounded-md hover:bg-muted/50"
          >
            <TbInfoCircle className="h-4 w-4" />
            <span>Cron expression format description</span>
          </div>

          <div className={cn("space-y-3", open ? "block" : "hidden")}>
            <div>
              <h4 className="font-medium text-foreground mb-2">
                Cron expression format
              </h4>
              <pre className="text-xs bg-muted/50 p-1 rounded-md border">
                {`  ┌──────────── seconds (0-59)
  │ ┌────────── minutes (0-59)
  │ │ ┌──────── hours (0-23)
  │ │ │ ┌────── day of month (1-31, L)(L last day of month)
  │ │ │ │ ┌──── month (1-12)
  │ │ │ │ │ ┌── day of week (0-7) (0,7 means Sunday)
  * * * * * *`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">
                Special character description
              </h4>
              <div>
                {[
                  { char: "*", desc: "Represents any value" },
                  {
                    char: "?",
                    desc: "Represents no specified value (same as *)",
                  },
                  { char: ",", desc: "Represents multiple values, e.g. 1,3,5" },
                  { char: "-", desc: "Represents a range, e.g. 1-5" },
                  { char: "/", desc: "Represents a step, e.g. */5" },
                  {
                    char: "L",
                    desc: "Represents the last, e.g. 5L represents the last Friday",
                  },
                  {
                    char: "#",
                    desc: "Represents the nth, e.g. 6#3 represents the third Saturday",
                  },
                  { char: "W", desc: "Represents the nearest working day" },
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
              <h4 className="font-medium text-foreground mb-2">
                Common expressions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {COMMON_EXPRESSIONS.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/5 hover:cursor-pointer transition-colors group"
                    onClick={() => {
                      setCustomExpression(item.value);
                      if (validateCronExpression(item.value)) {
                        onChange(item.value);
                      }
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
        </div>
      </div>
    );
  },
);
