import * as React from "react";
import { Check } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
// import LightRays from "./ui/lightRays";
// import LogoMark from "@/assets/images/logo.svg?react";
type ConfirmState = "loading" | "success" | "error";

export default function ConfirmSignup() {
  const [state, setState] = React.useState<ConfirmState>("loading");
  const [message, setMessage] = React.useState(
    "Please wait while we confirm your early access signup.",
  );

  React.useEffect(() => {
    async function confirmSignup() {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        setMessage(
          "Missing confirmation token. Please use the link from your email.",
        );
        setState("error");
        return;
      }

      try {
        const response = await fetch(
          `/api/waitlist-confirm?token=${encodeURIComponent(token)}`,
        );
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };

        if (response.ok && data.success) {
          setMessage("Your email is confirmed. You are on the waitlist.");
          setState("success");
          return;
        }

        setMessage(data.message || "Invalid or expired confirmation link.");
        setState("error");
      } catch {
        setMessage("Network error while confirming. Please try again.");
        setState("error");
      }
    }

    confirmSignup();
  }, []);

  return (
    <>

      {/* <LightRays
        className="absolute inset-0 z-0 size-full opacity-50 mix-blend-screen"
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={1.2}
        lightSpread={0.75}
        rayLength={1.1}
        followMouse
        mouseInfluence={0.1}
        noiseAmount={0.08}
        distortion={0.04}
        fadeDistance={0.9}
        saturation={0.85}
      /> */}

      {/* <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <LogoMark className="absolute bottom-[-10%] left-[-15%] size-40 opacity-5 md:bottom-[-6%] md:left-[-2%] md:size-80" />
        <LogoMark className="absolute top-[-8%] right-[-14%] size-40 opacity-5 md:right-[-2%] md:top-[-4%] md:size-80" />
      </div> */}
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {state === "success" ? (
            <Check
              aria-hidden="true"
              className="mx-auto mb-2 size-14 text-foreground"
              weight="bold"
            />
          ) : null}
          <CardTitle>Confirming your email</CardTitle>
          <CardDescription
            className={cn(
              state === "success" && "text-emerald-300",
              state === "error" && "text-destructive",
            )}
          >
            {message}
          </CardDescription>
        </CardHeader>

        {state === "loading" ? (
          <CardContent className="flex justify-center pb-6">
            <Spinner className="size-6" />
          </CardContent>
        ) : (
          <CardFooter className="justify-center border-t-0 pt-0 pb-6">
            <Button asChild variant="outline">
              <a href="/">Back to Luma</a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </>

  );
}
