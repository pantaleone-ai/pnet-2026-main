import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import Hero from "@/features/home/components/Hero";
import HeadingTitle from "@/components/HeadingTitle";
// import ContactMe from "@/components/ContactMe";
import FeaturedApps from "@/features/home/components/FeaturedApps";
import FeaturedProducts from "@/features/home/components/FeaturedProducts";
import FeaturedStoriesWrapper from "@/features/home/components/FeaturedStoriesWrapper";
import { WhatPeopleSay } from "@/features/home/components/WhatPeopleSay";
// import { FaqSection } from "@/features/home/components/FAQ";
import LatestBlogPosts from "@/features/home/components/LatestBlogPosts";
import ClientLogos from "@/features/home/components/ClientLogos";

export default function Home() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <Hero />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="AI Agents, Workflows & Apps" />
      <SeparatorHorizontal short={true} />
      <FeaturedStoriesWrapper />
      <SeparatorHorizontal short={true} />
      <FeaturedProducts />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Shipped apps and tools" />
      <SeparatorHorizontal short={true} />
      <FeaturedApps />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Recent build notes" />
      <SeparatorHorizontal short={true} />
      <LatestBlogPosts />
      <SeparatorHorizontal short={true} />
      <ClientLogos />
      <SeparatorHorizontal short={true} />
      <HeadingTitle title="Buyer notes" />
      <SeparatorHorizontal short={true} />
      <WhatPeopleSay />
      {/* <SeparatorHorizontal /> */}
      {/* <HeadingTitle title="FAQ" />
      <SeparatorHorizontal short={true} />
      <FaqSection />
      <SeparatorHorizontal short={true} />
      <ContactMe />
      <SeparatorHorizontal borderBottom={false} /> */}
    </>
  );
}
