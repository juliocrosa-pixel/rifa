import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MyNumbersClient from "@/components/MyNumbersClient";
import { getSettings } from "@/lib/raffles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Meus números" };

export default async function MyNumbersPage() {
  const settings = await getSettings();
  return (
    <>
      <SiteHeader siteName={settings.siteName} />
      <MyNumbersClient />
      <SiteFooter {...settings} />
    </>
  );
}
