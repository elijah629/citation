import type { Document } from "@contentful/rich-text-types";
import z from "zod";

export const citationFormSchema = z.object({
  url: z.url({
    protocol: /^(http|https)?$/,
    hostname: z.regexes.domain,
  }),
});

export type CitationFormState =
  | {
      type: "success";
      citation: Document;
    }
  | {
      type: "error";
      error: { message: string };
    }
  | {
      type: "ready";
    };
