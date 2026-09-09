import NAVIGATION_LINKS from "@/config/navigationLinks";
import { BriefcaseIcon } from "lucide-react";
import CardItem from "../about/CardItem";

const NavigationConsulting = () => {
  const consultingSection = NAVIGATION_LINKS.find(
    (item) => item.label === "Consulting",
  );
  const consultingLinks = consultingSection?.subNavigationLinks || [];

  return (
    <div className="grid w-[400px] grid-cols-1">
      <div className="flex flex-col gap-4 p-4">
        {consultingLinks.map((item) => (
          <CardItem
            key={item.href}
            href={item.href}
            title={item.label}
            description={item.description || ""}
            icon={item.icon || BriefcaseIcon}
            external={
              item.href.startsWith("http") || item.href.endsWith(".pdf")
            }
          />
        ))}
      </div>
    </div>
  );
};

export default NavigationConsulting;