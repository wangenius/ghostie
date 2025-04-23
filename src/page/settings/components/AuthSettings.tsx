import { dialog } from "@/components/custom/DialogModal";
import { FormContainer, FormInput } from "@/components/custom/FormWrapper";
import { Button } from "@/components/ui/button";
import { TbLoader2, TbUser } from "react-icons/tb";
import { SettingItem } from "./SettingItem";
import { UserMananger } from "../../../services/user/User";
import { useState } from "react";
import { cmd } from "@/utils/shell";

export function AuthSettings() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const user = UserMananger.use();

  const handleLogout = async () => {
    dialog.confirm({
      title: "Logout",
      content: "Are you sure you want to logout?",
      onOk: async () => {
        await UserMananger.logout();
      },
    });
  };

  const showLoginDialog = () => {
    dialog({
      title: "Login",
      className: "w-96",
      content: (close) => (
        <FormContainer
          className="w-full"
          onSubmit={async (data) => {
            try {
              setIsLoggingIn(true);
              await UserMananger.login(data.email, data.password);
              close();
            } finally {
              setIsLoggingIn(false);
            }
          }}
        >
          <div className="space-y-4">
            <FormInput
              name="email"
              type="email"
              placeholder="please enter email"
              required
              autoComplete="false"
            />

            <FormInput
              name="password"
              type="password"
              placeholder="please enter password"
              required
              autoComplete="false"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    logging in...
                  </>
                ) : (
                  "login"
                )}
              </Button>
            </div>
          </div>
        </FormContainer>
      ),
    });
  };

  const showRegisterDialog = () => {
    dialog({
      title: "Register",
      className: "w-96",
      content: (close) => (
        <FormContainer
          className="w-full"
          onSubmit={async (data) => {
            if (data.password !== data.confirmPassword) {
              cmd.message(
                "The passwords you entered are inconsistent",
                "error",
              );
              return;
            }
            try {
              setIsRegistering(true);
              await UserMananger.register(data.email, data.password);
              close();
            } finally {
              setIsRegistering(false);
            }
          }}
        >
          <div className="space-y-4">
            <FormInput
              name="email"
              type="email"
              placeholder="please enter email"
              required
            />
            <FormInput
              name="password"
              type="password"
              placeholder="please enter password"
              required
            />
            <FormInput
              name="confirmPassword"
              type="password"
              placeholder="please enter password again"
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    registering...
                  </>
                ) : (
                  "register"
                )}
              </Button>
            </div>
          </div>
        </FormContainer>
      ),
    });
  };

  return (
    <SettingItem
      icon={<TbUser className="w-[18px] h-[18px]" />}
      title={user ? "Account" : "Not logged in"}
      description={
        user
          ? `Current login: ${user.user_metadata.name || user.email}`
          : "Not logged in"
      }
      action={
        user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingIn}
          >
            logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={showLoginDialog}>
              login
            </Button>
            <Button size="sm" onClick={showRegisterDialog}>
              register
            </Button>
          </div>
        )
      }
    />
  );
}
