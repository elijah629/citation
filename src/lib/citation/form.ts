import type { Document } from "@contentful/rich-text-types";
import z from "zod";

export const citationFormSchema = z.object({
  url: z.url(),
});

export type CitationFormState = (
  | {
      type: "success";
      citation: Document; // Way easier to handle in case we need to add APA, etc. However we *do* lose the ability to inspect citations client side. Might be nice, if we need that we can add it as a new field.
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "ready";
    }
) & {
  url: string;
};
