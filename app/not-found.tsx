import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Custom 404 Not Found page
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-6xl font-bold">404</h1>
        <h2 className="mb-4 text-2xl font-semibold">No page at this address</h2>
        <p className="mb-6 text-muted-foreground">
          The link is wrong or the page moved. Go home and continue from there.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
