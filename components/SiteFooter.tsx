import BottomNavLinks from "@/components/footer/BottomNavLinks";
// import InspiredBy from "@/components/footer/InspiredBy";
import Copyright from "@/components/footer/Copyright";
import FooterBrand from "@/components/footer/FooterBrand";
import FooterDirectory from "@/components/footer/FooterDirectory";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";

export default function SiteFooter() {
  return (
    <footer className="w-full mx-auto overflow-x-hidden">
      {/* <InspiredBy />
      <TechStacks /> */}
      <SeparatorHorizontal short={true} />
      <FooterBrand />
      <SeparatorHorizontal short={true} />
      <FooterDirectory />
      <SeparatorHorizontal short={true} />
      <BottomNavLinks />
      <Copyright />
    </footer>
  );
}
