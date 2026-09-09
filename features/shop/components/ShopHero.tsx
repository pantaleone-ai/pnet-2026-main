import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShopHero() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Shop: workflows, apps, and guides</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          N8N workflow packs, Next.js AI starters, and prompt packs. Each
          listing names the stack and what you get.
        </p>
        <p className="text-base text-muted-foreground">
          Buy once, download, run it yourself. Support replies from Matt.
        </p>
      </CardContent>
    </Card>
  );
}
