import { TemplateEditorPage } from "@/components/features/documentation/template-editor-page";

export default async function EditDocumentationTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateEditorPage templateId={id} />;
}
