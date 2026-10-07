// jsdom has no layout/scrolling implementation; the shared Radix menu calls this browser API.
if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
import { act } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { textToRichDocument } from "./document-rich-format";
export const richEditor = (field: HTMLElement) => (field as HTMLElement & { editor: Editor }).editor;
export const changeRichText = (field: HTMLElement, text: string) => act(() => { richEditor(field).commands.setContent(textToRichDocument(text)); });
export const selectRichText = (field: HTMLElement, start: number, end=start) => act(() => { richEditor(field).commands.setTextSelection({ from: start+1, to: end+1 }); });
