import { Button } from "@/components/ui/button";
import LogoWithText from "@/assets/images/logo-with-text.svg?react";

export default function NavBar() {
  return (
    <header className="border-b border-border mb-6">
      <div className="container flex items-center justify-between py-3">
        <a href="/">
      <LogoWithText className="h-5 w-auto"/>
        </a>

        <div className="flex items-center">
          <Button size="sm" className="relative">
            <a
              href="#waitlist"
              className="before:content-[''] before:absolute before:inset-0"
            >
              Get Early Access
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
