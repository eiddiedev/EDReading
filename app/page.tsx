/**
 * 应用首页重定向到文库页。
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/library");
}
