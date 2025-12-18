"use client";

import Form from "next/form";
import { useActionState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCitation } from "@/app/actions";
import type { CitationFormState } from "@/lib/citation/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { RichTextEntry } from "./rich-text-entry";

const initialState: CitationFormState = {
  type: "ready",
};

export function CitationForm() {
  const [state, formAction, pending] = useActionState(
    createCitation,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste a URL to cite</CardTitle>
        <CardDescription>
          We&apos;ll fetch the page, follow MLA 9 works cited rules, and return
          a polished entry you can drop into your bibliography.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form action={formAction} id="mla9-form">
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={state.type === "error"}>
                <FieldLabel htmlFor="mla9-form-url">Article URL</FieldLabel>
                <Input
                  type="url"
                  id="mla9-form-url"
                  name="url"
                  aria-invalid={state.type === "error"}
                  required
                  placeholder="https://example.com/article"
                />
                <FieldDescription>
                  Your URL is sent to Chegg&apos;s API through Vercel to build
                  the citation, parsed with Readability, and refined by Hackclub
                  AI for MLA 9 accuracy. Best for individual articles, not
                  entire sites.
                </FieldDescription>
                {state.type === "error" && (
                  <FieldError errors={[state.error]} />
                )}
              </Field>
            </FieldGroup>
          </FieldSet>
          {state?.type === "success" && (
            <RichTextEntry citation={state.citation} />
          )}
        </Form>
      </CardContent>
      <CardFooter>
        <FieldGroup>
          <Field orientation="responsive">
            <Button disabled={pending} type="submit" form="mla9-form">
              {pending ? "Fetching..." : "Fetch citation"}
            </Button>
          </Field>
        </FieldGroup>
      </CardFooter>
    </Card>
  );
}
