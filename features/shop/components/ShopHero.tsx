import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShopHero() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Welcome to the AI Shop</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          Explore our collection of AI applications, workflows, services, and digital artwork.
        </p>
        <p className="text-base text-muted-foreground">
          All products are designed to help you leverage AI technology in your projects and business.
        </p>
      </CardContent>
    </Card>
  );
}
