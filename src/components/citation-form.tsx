"use client";

import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { Tinos } from "next/font/google";
import Form from "next/form";
import { useActionState, useRef } from "react";

import { createCitation } from "@/app/actions";
import type { CitationFormState } from "@/lib/citation/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const initialState: CitationFormState = {
  type: "ready",
  url: "",
};

const tinos = Tinos({
  subsets: ["latin"],
  weight: ["400"],
});

export function CitationForm() {
  const [state, formAction, pending] = useActionState(
    createCitation,
    initialState,
  );
  const copyRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    if (!copyRef.current) {
      return;
    }

    const htmlBlob = new Blob([copyRef.current.outerHTML], {
      type: "text/html",
    });
    const textBlob = new Blob([copyRef.current.innerText], {
      type: "text/plain",
    });

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);
  }

  return (
    <Form
      action={formAction}
      className="space-y-6 rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <Label className="text-base font-semibold" htmlFor="url">
            Paste a URL to cite
          </Label>
          <p className="text-sm text-muted-foreground">
            We&apos;ll fetch the page, follow MLA 9 works cited rules, and
            return a polished entry you can drop into your bibliography.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="url"
            id="url"
            name="url"
            required
            className="h-12 flex-1 text-base"
            placeholder="https://example.com/article"
          />
          <Button disabled={pending} type="submit" className="h-12 px-6">
            {pending ? "Fetching…" : "Fetch citation"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your URL is sent to Chegg&apos;s API through Vercel to build the
          citation, parsed with Readability, and refined by Hackclub AI for MLA
          9 accuracy. Best for individual articles, not entire sites.
        </p>
      </div>

      {state?.type === "error" && (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state?.type === "success" && (
        <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">
              Works cited entry
            </p>
            <Button
              onClick={handleCopy}
              type="button"
              variant="secondary"
              size="sm"
            >
              Copy
            </Button>
          </div>

          {/* Not using tailwind for rich-text copy support */}
          <div className={tinos.className}>
            <div
              ref={copyRef}
              style={{
                marginLeft: 36,
                textIndent: -36,
                overflowWrap: "break-word",
                fontSize: "12pt",
              }}
            >
              {documentToReactComponents(state.citation)}
            </div>
          </div>
        </div>
      )}
    </Form>
  );
}
