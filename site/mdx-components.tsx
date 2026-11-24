import { useMDXComponents as getDocsComponents } from "nextra-theme-docs";
import { Decisions, Glossary, Groups, Kits, RouteTable } from "@/components/data";
import { Accordion, Accordions, Callout, Card, Cards, File, Files, Folder, Step, Steps, Tab, Tabs, TypeTable } from "@/components/mdx";
import { CTA, Closing, Fact, FactList, Feature, Features, Hero, Lifecycle, Section, Statement } from "@/components/marketing";
import { WaitlistForm } from "@/components/waitlist-form";

export function useMDXComponents(components?: Record<string, unknown>) {
  return {
    ...getDocsComponents(),
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    File,
    Files,
    Folder,
    TypeTable,
    RouteTable,
    Groups,
    Glossary,
    Kits,
    Decisions,
    Hero,
    Statement,
    Section,
    Features,
    Feature,
    Closing,
    CTA,
    Fact,
    FactList,
    Lifecycle,
    WaitlistForm,
    ...components,
  };
}
