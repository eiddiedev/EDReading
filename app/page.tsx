/**
 * 应用的首页重定向逻辑，将用户引导至 /library 页面。
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/library");
}
