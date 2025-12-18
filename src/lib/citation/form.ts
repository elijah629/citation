import type { Document } from "@contentful/rich-text-types";
import z from "zod";

export const citationFormSchema = z.object({
  url: z.url(),
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
