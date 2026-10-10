import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DocumentTextStyle } from "@/lib/entity/documentation";
import { DocumentRichText } from "./document-rich-text";
import { richEditor, selectRichText } from "./rich-editor-test-utils";
import { richDocumentToText, textToRichDocument, removeTextRange } from "./document-rich-format";
import { localDocumentLayout } from "./local-document-layout";
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
function Editor() {
  const [draft, setDraft] = useState<{text:string; textStyles?:DocumentTextStyle[]}>({text:"Nombre del paciente"});
  return <DocumentRichText label="Texto" value={draft.text} textStyles={draft.textStyles} onChange={(text,textStyles) => setDraft({text,textStyles})} textareaClassName="h-64" />;
}
describe("document text formatting", () => {
  it("configures an observation title before inserting at the selected text without moving scroll", async () => {
    render(<Editor />); const field=screen.getByRole("textbox",{name:"Texto"}); selectRichText(field,0,6);
    const viewport=field.parentElement!.parentElement!; viewport.scrollTop=80;
    fireEvent.click(screen.getByLabelText("documentation.variable"));
    fireEvent.click(await screen.findByRole("option",{name:/documentation\.observations/}));
    expect(screen.getByRole("button",{name:"documentation.addObservation"})).toBeDisabled();
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("Nombre del paciente");
    fireEvent.change(screen.getByLabelText("documentation.observationTitle"),{target:{value:"Riesgos personalizados"}});
    fireEvent.click(screen.getByRole("button",{name:"documentation.addObservation"}));
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("{{observaciones:Riesgos personalizados}} del paciente");
    expect(viewport.scrollTop).toBe(80);
  });
  it("leaves the selected text untouched when observation configuration is cancelled", async () => {
    render(<Editor />); const field=screen.getByRole("textbox",{name:"Texto"}); selectRichText(field,0,6);
    fireEvent.click(screen.getByLabelText("documentation.variable"));
    fireEvent.click(await screen.findByRole("option",{name:/documentation\.observations/}));
    fireEvent.change(screen.getByLabelText("documentation.observationTitle"),{target:{value:"Riesgos"}});
    fireEvent.click(screen.getByRole("button",{name:"documentation.cancel"}));
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("Nombre del paciente");
  });
  it("formats selected words, preserves selection when choosing a font and supports undo", () => {
    render(<Editor />);
    const field=screen.getByRole("textbox",{name:"Texto"}); selectRichText(field,0,6);
    fireEvent.click(screen.getByLabelText("documentation.bold"));
    fireEvent.click(screen.getByLabelText("documentation.italic"));
    fireEvent.click(screen.getByLabelText("documentation.underline"));
    fireEvent.change(screen.getByLabelText("documentation.fontFamily"), {target:{value:"Times New Roman"}});
    fireEvent.change(screen.getByLabelText("documentation.fontSize"), {target:{value:"18"}});
    const result=richDocumentToText(richEditor(field).getJSON());
    expect(result.text).toBe("Nombre del paciente");
    expect(result.textStyles[0]).toMatchObject({start:0,end:6,bold:true,italic:true,underline:true,fontFamily:"Times New Roman",fontSize:18});
    expect(result.textStyles.at(-1)).toMatchObject({bold:false,italic:false});
    fireEvent.click(screen.getByLabelText("documentation.undo"));
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("Nombre del paciente");
  });
  it("aligns a paragraph and inserts a formatted variable without scrolling", async () => {
    render(<Editor />); const field=screen.getByRole("textbox",{name:"Texto"}); selectRichText(field,0,6);
    fireEvent.click(screen.getByLabelText("documentation.bold"));
    fireEvent.click(screen.getByLabelText("documentation.alignCENTER"));
    const viewport=field.parentElement!.parentElement!;viewport.scrollTop=80;
    fireEvent.click(screen.getByLabelText("documentation.variable"));
    fireEvent.click(await screen.findByRole("option",{name:/documentation\.patientName/}));
    const result=richDocumentToText(richEditor(field).getJSON());
    expect(result.text).toBe("{{paciente.nombre}} del paciente");
    expect(result.textStyles[0]).toMatchObject({bold:true,alignment:"CENTER"});expect(viewport.scrollTop).toBe(80);
  });
  it("selects a date variable using the shared popup and keeps the text insertion point", async () => {
    render(<Editor />);const field=screen.getByRole("textbox",{name:"Texto"});selectRichText(field,0,6);
    const selector=screen.getByLabelText("documentation.variable");expect(selector.tagName).toBe("BUTTON");
    fireEvent.keyDown(selector,{key:"ArrowDown"});
    fireEvent.click(await screen.findByRole("option",{name:/documentation\.currentDate/}));
    const dateSource=screen.getByLabelText("documentation.dateSource");
    fireEvent.keyDown(dateSource,{key:"ArrowDown"});
    fireEvent.click(await screen.findByRole("option",{name:"documentation.dateSelectedAtGeneration"}));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("Nombre del paciente");
    fireEvent.click(screen.getByLabelText("documentation.dateFormat"));
    fireEvent.click(await screen.findByRole("option",{name:"2026-12-31"}));
    fireEvent.change(screen.getByLabelText("documentation.dateTitle"), {target:{value:"Fecha de cirugía"}});
    fireEvent.click(screen.getByText("documentation.addDate"));
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("{{fecha_documento:seleccionada:YMD_DASH:Fecha de cirugía}} del paciente");
  });
  it("uses the doctor's searchable corporate combobox and filters variables", async () => {
    render(<Editor />);const field=screen.getByRole("textbox",{name:"Texto"});selectRichText(field,0,6);
    fireEvent.click(screen.getByLabelText("documentation.variable"));
    const search=screen.getByPlaceholderText("documentation.search");
    fireEvent.change(search,{target:{value:"doctorLicense"}});
    expect(screen.queryByRole("option",{name:/documentation\.patientName/})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option",{name:/documentation\.doctorLicense/}));
    expect(richDocumentToText(richEditor(field).getJSON()).text).toBe("{{doctor.licencia}} del paciente");
  });
  it("round trips multiple paragraphs and adjusts styled ranges when deleting text", () => {
    const text="Título\nDatos {{paciente.nombre}}";
    const styles:DocumentTextStyle[]=[{start:0,end:7,bold:true,fontSize:18,alignment:"CENTER"},{start:7,end:text.length,fontFamily:"Courier New",italic:true,alignment:"RIGHT"}];
    const result=richDocumentToText(textToRichDocument(text,styles));
    expect(result.text).toBe(text);expect(result.textStyles[0]).toMatchObject({bold:true,fontSize:18,alignment:"CENTER"});
    const removed=removeTextRange(text,result.textStyles,0,7);
    expect(removed.text).toBe("Datos {{paciente.nombre}}");expect(removed.textStyles[0]).toMatchObject({start:0,italic:true,alignment:"RIGHT"});
  });
  it("keeps consecutive small and large lines from overlapping", () => {
    const layout=localDocumentLayout({name:"Mixed",blocks:[{type:"TEXT",text:"small\nLARGE",textStyles:[{start:0,end:6,fontSize:6},{start:6,end:11,fontSize:36}]}]}, (text,size)=>text.length*size/2);
    const [small,large]=layout.lines;
    expect(small.size).toBe(6);expect(large.size).toBe(36);
    expect(large.y-large.size).toBeGreaterThanOrEqual(small.y+5-.01);
    expect(layout.placements[0].height).toBe(52);
  });
  it("reflows larger text around signature obstacles and positions aligned rows", () => {
    const text="Texto legal ".repeat(200);
    const layout=localDocumentLayout({name:"Formato",blocks:[{type:"TEXT",text,textStyles:[{start:0,end:text.length,fontSize:24,bold:true,alignment:"RIGHT"}]},{type:"SIGNATURE",width:200,height:120,position:{page:0,x:48,y:200}}]}, (text,size)=>text.length*size/2);
    expect(layout.pageCount).toBeGreaterThan(1);expect(layout.lines.every(line=>line.size===24)).toBe(true);
    expect(layout.placements.filter(p=>p.type==="TEXT"&&p.page===0).every(p=>p.y+p.height<=192||p.y>=328)).toBe(true);
    expect(layout.lines[0].x).toBeGreaterThanOrEqual(48);
  });
});
