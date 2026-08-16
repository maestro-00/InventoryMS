import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Progress } from "./progress";
import { Separator } from "./separator";
import { SheetFooter, SheetHeader } from "./sheet";
import { Skeleton } from "./skeleton";
import { Textarea } from "./textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

describe("audited primitives", () => {
  it("renders stable accessible controls", () => {
    render(
      <div>
        <Button>Save</Button>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
        <Textarea aria-label="Notes" />
        <Badge>Open</Badge>
        <Alert>
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>Safe message</AlertDescription>
        </Alert>
        <Separator />
        <Skeleton className="h-4 w-10" />
        <Progress value={40} />
      </div>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Notice");
  });

  it("supports asChild buttons, sheet chrome, and tooltip content", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Button asChild>
          <a href="/dashboard">Go</a>
        </Button>
        <SheetHeader>Header</SheetHeader>
        <SheetFooter>Footer</SheetFooter>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">Hint</button>
          </TooltipTrigger>
          <TooltipContent>Helpful</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "Hint" }));
  });
});
