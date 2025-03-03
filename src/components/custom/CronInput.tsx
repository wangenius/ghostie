import { Input } from "@/components/ui/input";
import { SchedulerManager } from "@/workflow/scheduler/SchedulerManager";
import { CronExpressionParser } from "cron-parser";
import { Info } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { NestedDrawer } from "../ui/drawer";

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
    label: "每秒执行",
    value: "* * * * * *",
    description: "每秒执行一次任务",
  },
  {
    label: "每分钟执行",
    value: "0 * * * * *",
    description: "每分钟执行一次任务",
  },
  {
    label: "每小时执行",
    value: "0 0 * * * *",
    description: "每小时整点执行",
  },
  {
    label: "每天零点",
    value: "0 0 0 * * *",
    description: "每天凌晨0点执行",
  },
  {
    label: "每周一零点",
    value: "0 0 0 * * 1",
    description: "每周一凌晨0点执行",
  },
  {
    label: "工作日9点",
    value: "0 0 9 * * 1-5",
    description: "周一到周五每天9点执行",
  },
  {
    label: "每月1号零点",
    value: "0 0 0 1 * *",
    description: "每月1号凌晨0点执行",
  },
  {
    label: "每月最后一天",
    value: "0 0 0 L * *",
    description: "每月最后一天凌晨0点执行",
  },
  {
    label: "每月最后一个周五",
    value: "0 0 0 * * 5L",
    description: "每月最后一个周五凌晨0点执行",
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

    const nextDate = SchedulerManager.calculateNextRun(cronExpression);

    // 预定义的常见cron表达式模式
    const commonPatterns: Record<string, string> = {
      "* * * * * *": "每秒执行一次任务",
      "0 * * * * *": "每分钟执行一次任务",
      "0 0 * * * *": "每小时整点执行",
      "0 0 0 * * *": "每天凌晨0点执行",
      "0 0 0 * * 1": "每周一凌晨0点执行",
      "0 0 9 * * 1-5": "周一到周五每天9点执行",
      "0 0 0 1 * *": "每月1号凌晨0点执行",
      "0 0 0 L * *": "每月最后一天凌晨0点执行",
      "0 0 0 * * 5L": "每月最后一个周五凌晨0点执行",
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
      return ["无效的 cron 表达式", ""];
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
        description = `${dateDesc}${timeDesc}执行`;
      } else if (dateDesc) {
        description = `${dateDesc}执行`;
      } else if (timeDesc) {
        description = `每天${timeDesc}执行`;
      } else {
        description = "执行时间未定义";
      }
    }

    return [description, formatNextRunTime(nextDate, timeZone)];
  } catch (err) {
    console.error("解析cron表达式出错:", err);
    return ["无效的 cron 表达式", ""];
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
  // 秒部分
  if (second === "*" && minute === "*" && hour === "*") {
    return "每秒";
  }

  // 分钟部分
  if (second === "0" && minute === "*" && hour === "*") {
    return "每分钟";
  }

  if (second === "0" && hour === "*") {
    if (minute.includes("/")) {
      const interval = minute.split("/")[1];
      return `每隔${interval}分钟`;
    }
    if (minute.includes(",")) {
      return `每小时的第${minute.replace(/,/g, "、")}分`;
    }
    return minute === "0" ? "每小时整点" : `每小时的第${minute}分`;
  }

  // 小时部分
  let hourDesc = "";
  if (hour.includes("-")) {
    const [start, end] = hour.split("-");
    hourDesc = `${start}点到${end}点`;
  } else if (hour.includes(",")) {
    hourDesc = `${hour.replace(/,/g, "、")}点`;
  } else if (hour.includes("/")) {
    const interval = hour.split("/")[1];
    hourDesc = `每隔${interval}小时`;
  } else if (hour !== "*") {
    hourDesc = `${hour}点`;
  }

  // 分钟部分
  let minuteDesc = "";
  if (minute === "0") {
    minuteDesc = "";
  } else if (minute.includes(",")) {
    minuteDesc = `${minute.replace(/,/g, "、")}分`;
  } else if (minute.includes("/")) {
    const interval = minute.split("/")[1];
    minuteDesc = `每隔${interval}分钟`;
  } else if (minute !== "*") {
    minuteDesc = `${minute}分`;
  }

  // 秒部分
  let secondDesc = "";
  if (second === "0") {
    secondDesc = "";
  } else if (second.includes(",")) {
    secondDesc = `${second.replace(/,/g, "、")}秒`;
  } else if (second.includes("/")) {
    const interval = second.split("/")[1];
    secondDesc = `每隔${interval}秒`;
  } else if (second !== "*") {
    secondDesc = `${second}秒`;
  }

  // 组合时间描述
  let timeDesc = "";
  if (hourDesc) {
    timeDesc += hourDesc;
  }
  if (minuteDesc) {
    timeDesc += minuteDesc;
  }
  if (secondDesc) {
    timeDesc += secondDesc;
  }

  return timeDesc || "每天";
};

// 获取日期描述
const getDateDescription = (
  dayOfMonth: string,
  month: string,
  dayOfWeek: string,
): string => {
  const weekMap: Record<string, string> = {
    "0": "周日",
    "1": "周一",
    "2": "周二",
    "3": "周三",
    "4": "周四",
    "5": "周五",
    "6": "周六",
    "7": "周日",
  };

  // 如果所有日期字段都是*，则返回空字符串（由时间部分处理）
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "";
  }

  // 处理星期几
  if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-");
      return `每周${weekMap[start]}到${weekMap[end]}`;
    } else if (dayOfWeek.includes(",")) {
      return `每周${dayOfWeek
        .split(",")
        .map((d) => weekMap[d])
        .join("、")}`;
    } else if (!dayOfWeek.includes("L") && !dayOfWeek.includes("#")) {
      return `每周${weekMap[dayOfWeek]}`;
    }
  }

  // 处理日期
  if (dayOfMonth !== "*") {
    if (dayOfMonth === "L") {
      return "每月最后一天";
    } else if (dayOfMonth.includes("W")) {
      const day = dayOfMonth.replace("W", "");
      return day === "1" ? "每月第一个工作日" : `每月${day}号最近的工作日`;
    } else if (dayOfMonth.includes("-")) {
      const [start, end] = dayOfMonth.split("-");
      return `每月${start}号到${end}号`;
    } else if (dayOfMonth.includes(",")) {
      return `每月${dayOfMonth.replace(/,/g, "、")}号`;
    } else if (dayOfMonth.includes("/")) {
      const interval = dayOfMonth.split("/")[1];
      return `每月每隔${interval}天`;
    } else {
      return `每月${dayOfMonth}号`;
    }
  }

  // 处理月份
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
      return `每年${monthNames[parseInt(start)]}到${monthNames[parseInt(end)]}`;
    } else if (month.includes(",")) {
      return `每年${month
        .split(",")
        .map((m) => monthNames[parseInt(m)])
        .join("、")}`;
    } else if (month.includes("/")) {
      const interval = month.split("/")[1];
      return `每年每隔${interval}个月`;
    } else {
      return `每年${monthNames[parseInt(month)]}`;
    }
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
    "0L": "周日",
    "1L": "周一",
    "2L": "周二",
    "3L": "周三",
    "4L": "周四",
    "5L": "周五",
    "6L": "周六",
    "7L": "周日",
    "0": "周日",
    "1": "周一",
    "2": "周二",
    "3": "周三",
    "4": "周四",
    "5": "周五",
    "6": "周六",
    "7": "周日",
  };

  const day = dayOfWeek.replace("L", "");
  let description = `每月最后一个${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += "凌晨0点执行";
  } else if (second === "0" && minute === "0") {
    description += `${hour}点执行`;
  } else if (second === "0") {
    description += `${hour}点${minute}分执行`;
  } else {
    description += `${hour}点${minute}分${second}秒执行`;
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
    "0": "周日",
    "1": "周一",
    "2": "周二",
    "3": "周三",
    "4": "周四",
    "5": "周五",
    "6": "周六",
    "7": "周日",
  };

  const [day, nth] = dayOfWeek.split("#");
  const ordinals = ["", "第一个", "第二个", "第三个", "第四个", "第五个"];

  let description = `每月${ordinals[parseInt(nth)]}${weekMap[day]}`;

  if (second === "0" && minute === "0" && hour === "0") {
    description += "凌晨0点执行";
  } else if (second === "0" && minute === "0") {
    description += `${hour}点执行`;
  } else if (second === "0") {
    description += `${hour}点${minute}分执行`;
  } else {
    description += `${hour}点${minute}分${second}秒执行`;
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
          setError(err instanceof Error ? err.message : "无效的 cron 表达式");
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Input
            value={customExpression}
            onChange={handleCustomExpressionChange}
            placeholder="输入 cron 表达式，如: 0 0 0 * * *"
            className="font-mono"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        {description && (
          <div>
            <p className="text-sm text-muted-foreground">{description[0]}</p>
            <p className="text-sm text-muted-foreground">{description[1]}</p>
          </div>
        )}

        <Button onClick={() => setOpen(true)} variant="outline" size="icon">
          <Info className="w-4 h-4" />
        </Button>

        <NestedDrawer open={open} onOpenChange={setOpen} direction="right">
          <div className="text-xs text-muted-foreground space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">
                Cron 表达式格式
              </h4>
              <pre className="text-xs bg-muted/50 p-1 rounded-md border">
                {`  ┌──────────── 秒 (0-59)
  │ ┌────────── 分钟 (0-59)
  │ │ ┌──────── 小时 (0-23)
  │ │ │ ┌────── 日期 (1-31, L)(L最后一天)
  │ │ │ │ ┌──── 月份 (1-12)
  │ │ │ │ │ ┌── 星期 (0-7) (0,7表示星期日)
  * * * * * *`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">特殊字符说明</h4>
              <div>
                {[
                  { char: "*", desc: "表示任意值" },
                  { char: "?", desc: "表示不指定值（与 * 相同）" },
                  { char: ",", desc: "表示多个值，如: 1,3,5" },
                  { char: "-", desc: "表示范围，如: 1-5" },
                  { char: "/", desc: "表示步长，如: */5" },
                  {
                    char: "L",
                    desc: "表示最后，如: 5L 表示最后一个星期五",
                  },
                  {
                    char: "#",
                    desc: "表示第几个，如: 6#3 表示第三个星期六",
                  },
                  {
                    char: "W",
                    desc: "表示工作日",
                  },
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
        </NestedDrawer>
      </div>
    );
  },
);
