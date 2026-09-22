import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/services/cart";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const bag = user?.role === "CUSTOMER" ? await cartCount(user.id) : 0;
  return (
    <>
      <Header />
      {/* bottom padding keeps content clear of the phone tab bar */}
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <main>{children}</main>
        <Footer />
      </div>
      <MobileTabBar bagCount={bag} />
      <InstallPrompt />
    </>
  );
}
