import { Document } from "@contentful/rich-text-types";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, CopyIcon } from "lucide-react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { Tinos } from "next/font/google";
import { Button } from "./ui/button";

const tinos = Tinos({
  subsets: ["latin"],
  weight: ["400"],
});

export function RichTextEntry({ citation }: { citation: Document }) {
  const [copied, setCopied] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    if (!copyRef.current || copied) {
      return;
    }

    const htmlBlob = new Blob([copyRef.current.outerHTML], {
      type: "text/html",
    });
    const textBlob = new Blob([documentToPlainTextString(citation)], {
      type: "text/plain",
    });

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Item variant="outline" className="mt-2">
      <ItemContent>
        <ItemTitle>Works cited entry</ItemTitle>
        {/* Not using tailwind for rich-text copy support */}
        <div className={cn(tinos.className, "line-clamp-2")}>
          <div
            ref={copyRef}
            style={{
              paddingLeft: "36pt",
              textIndent: "-36pt",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              fontSize: "12pt",
            }}
          >
            {documentToReactComponents(citation)}
          </div>
        </div>
      </ItemContent>
      <ItemActions>
        <Button onClick={handleCopy} variant="outline" size="icon">
          {copied ? <Check /> : <CopyIcon />}
        </Button>
      </ItemActions>
    </Item>
  );
}
