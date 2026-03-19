import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  className?: string;
}

export default function Component({ label, className }: Props) {
  const id = useId();
  return (
    <div className={cn("*:not-first:mt-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        className="p-0 pe-3 file:me-3 file:border-0 file:border-e"
        id={id}
        type="file"
      />
    </div>
  );
}
