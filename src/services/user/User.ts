import { Echoi } from "@/lib/echo/Echo";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { User } from "@supabase/auth-js";

export class UserMananger {
  static store = new Echoi<User | null>(null);
  static use = this.store.use.bind(this.store);

  static async init() {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        console.log("user", user);
        UserMananger.store.set(user);
      }
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        UserMananger.store.set(session.user);
      } else {
        UserMananger.store.set(null);
      }
    });
  }

  static async login(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
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
      this.store.reset();
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
