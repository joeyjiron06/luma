import * as React from "react";
import { Accordion as AccordionPrimitives } from "radix-ui";
import { CaretDown } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitives.Root>
) {
  return (
    <AccordionPrimitives.Root data-slot="accordion" {...props} />
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitives.Item>) {
  return (
    <AccordionPrimitives.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitives.Trigger>) {
  return (
    <AccordionPrimitives.Header className="flex">
      <AccordionPrimitives.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-none py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <CaretDown
          className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200"
          aria-hidden
        />
      </AccordionPrimitives.Trigger>
    </AccordionPrimitives.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitives.Content>) {
  return (
    <AccordionPrimitives.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pt-0 pb-4 text-balance leading-relaxed", className)}>
        {children}
      </div>
    </AccordionPrimitives.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
