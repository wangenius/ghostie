import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserMananger } from "@/services/user/User";
import {
  ExclamationTriangleIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  LockClosedIcon,
  PersonIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { Window } from "@tauri-apps/api/window";
import React, { useCallback, useState } from "react";
import { TbX } from "react-icons/tb";

export function LoginPage() {
  const [formType, setFormType] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (formType === "login") {
        await UserMananger.login(username, password);
      } else {
        // 简单的密码匹配验证
        if (password !== confirmPassword) {
          throw new Error("两次输入的密码不匹配");
        }
        // 这里应该有注册逻辑
        // await UserMananger.register(username, email, password);
        throw new Error("注册功能尚未实现");
      }
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "操作失败，请稍后再试",
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleCloseClick = useCallback(() => {
    Window.getByLabel("main").then((window) => {
      window?.hide();
    });
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-1.5 draggable m-full flex items-center justify-between h-10">
        <span className="text-xs pl-2 text-muted-foreground flex items-center gap-2">
          <img src="/icon.png" className="w-6 h-6" />
        </span>
        <Button size={"icon"} variant={"ghost"} onClick={handleCloseClick}>
          <TbX className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm p-4">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-medium">
              {formType === "login" ? "账号登录" : "新用户注册"}
            </h2>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-center gap-2 text-sm mb-6">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {formType === "login" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <PersonIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    className="pl-10 h-12"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">密码</Label>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal"
                    type="button"
                    onClick={() => setError("密码找回功能即将上线")}
                  >
                    忘记密码?
                  </Button>
                </div>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeClosedIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOpenIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-9"
                variant={"default"}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  还没有账号？
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setFormType("register")}
                  >
                    立即注册
                  </Button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">用户名</Label>
                <div className="relative">
                  <PersonIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-username"
                    type="text"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请设置用户名"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请设置密码"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeClosedIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOpenIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 my-4">
                <Checkbox id="terms" required />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal cursor-pointer"
                >
                  我已阅读并同意
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal mx-1"
                  >
                    服务条款
                  </Button>
                  和
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal mx-1"
                  >
                    隐私政策
                  </Button>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-9"
                variant={"default"}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  "创建账号"
                )}
              </Button>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  已有账号？
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => setFormType("login")}
                  >
                    返回登录
                  </Button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
