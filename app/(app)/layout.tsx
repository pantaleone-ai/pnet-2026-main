import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ScrollToTop } from "@/components/ScrollToTop";
import ChatHost from "@/features/chat/ChatHost";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full">
      <ChatHost>
        <SiteHeader />
        <main
          id="main-content"
          className="mx-auto max-w-5xl w-full text-center border-x border-edge"
        >
          {children}
        </main>
        <SiteFooter />
        <ScrollToTop />
      </ChatHost>
    </div>
  );
}
