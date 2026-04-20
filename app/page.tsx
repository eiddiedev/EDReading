/**
 * 应用首页重定向到精选文章页。
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/featured");
}
