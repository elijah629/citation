"use client";

import { createCitation } from "@/app/actions";
import { useActionState, useRef } from "react";
import Form from "next/form";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { CitationFormState } from "@/lib/citation/form";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { Tinos } from "next/font/google";

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
    <Form action={formAction} className="flex flex-col gap-4 p-4 border m-4">
      <Label htmlFor="url">URL</Label>
      <Input type="url" id="url" name="url" required />
      <p>
        Your URL will be sent to Chegg&apos;s API, and fetched through
        Vercel&apos;s servers. It is formatted using a custom{" "}
        <strong>MLA 9</strong> formatter. The content of the website will be
        parsed by <strong>Readability.js</strong> and sent to{" "}
        <strong>Hackclub AI</strong> to use an LLM to improve the citation based
        on the website content.{" "}
        <strong>
          Please note: this process is not well-suited for entire websites and
          works best for individual articles.
        </strong>
      </p>
      {state?.type === "error" && <p aria-live="polite">{state.message}</p>}
      <Button disabled={pending} type="submit">
        Fetch
      </Button>
      {state?.type === "success" && (
        <>
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
          <Button onClick={handleCopy}>Copy</Button>
        </>
      )}
    </Form>
  );
}
