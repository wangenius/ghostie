import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { User } from "@supabase/auth-js";
import { Echo } from "echo-state";

export class UserMananger {
  static store = new Echo<User | null>(null);
  static {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        this.store.set(user);
      }
    });
    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.store.set(session.user);
      } else {
        this.store.set(null);
      }
    });
  }
  static use = this.store.use.bind(this.store);
  static current = this.store.current;

  static async login(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      cmd.message("login success", "success");
    } catch (error) {
      console.error("login failed:", error);
      cmd.message(
        `login failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }

  static async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      this.store.set(null);
      cmd.message("logged out", "success");
    } catch (error) {
      console.error("logout failed:", error);
      cmd.message(
        `logout failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }

  static async register(email: string, password: string) {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
      });

      // 检查是否已注册
      if (result.data?.user?.identities?.length === 0) {
        cmd.message("The email has been registered", "error");
        return;
      }

      if (result.error) {
        throw result.error;
      }
      close();
      cmd.message(
        "register success, please check email verification",
        "success",
      );
    } catch (error) {
      console.error("register failed:", error);
      cmd.message(
        `register failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }
}
