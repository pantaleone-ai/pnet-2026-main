import NAVIGATION_LINKS from "@/config/navigationLinks";
import { AppWindowMacIcon } from "lucide-react";
import CardItem from "../about/CardItem";

const NavigationShop = () => {
  const shopSection = NAVIGATION_LINKS.find((item) => item.label === "Shop");
  const shopLinks = shopSection?.subNavigationLinks || [];

  return (
    <div className="grid w-[400px] grid-cols-1">
      <div className="flex flex-col gap-4 p-4">
        {shopLinks.map((item) => (
          <CardItem
            key={item.href}
            href={item.href}
            title={item.label}
            description={item.description || ""}
            icon={item.icon || AppWindowMacIcon}
            external={
              item.href.startsWith("http") || item.href.endsWith(".pdf")
            }
          />
        ))}
      </div>
    </div>
  );
};

export default NavigationShop;
