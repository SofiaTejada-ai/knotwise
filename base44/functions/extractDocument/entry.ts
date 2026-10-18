import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Reads a student-uploaded document into plain text. PDF works today; Word
// and PowerPoint need a conversion service that is not connected yet, so
// they are rejected with a clear message instead of a confusing failure.

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'The document title, or a short name if the document has none' },
    fullText: { type: 'string', description: 'The full readable text of the document, keeping headings and order' }
  },
  required: ['title', 'fullText']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = typeof body.file_uri === 'string' ? body.file_uri.trim() : '';
    const fileName = typeof body.fileName === 'string' ? body.fileName.slice(0, 200) : '';
    if (!fileUri) return Response.json({ error: 'No document was received.' }, { status: 400 });

    const lower = fileName.toLowerCase();
    if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
      return Response.json(
        {
          error:
            'Word and PowerPoint files need a conversion service that is not connected yet. Please save the material as a PDF and upload that.'
        },
        { status: 422 }
      );
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 300
    });
    if (!signed_url) return Response.json({ error: 'The document could not be opened.' }, { status: 500 });

    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: signed_url,
      json_schema: EXTRACT_SCHEMA
    });
    const output = result?.output ?? {};
    const title = String(output.title || fileName || 'Uploaded material')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    const fullText = String(output.fullText ?? '')
      .trim()
      .slice(0, 30000);
    if (!fullText) {
      return Response.json({ error: 'No readable text was found in this document.' }, { status: 422 });
    }
    return Response.json({ document: { title, fullText } });
  } catch (error) {
    console.log('extractDocument: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The document could not be read right now.' }, { status: 500 });
  }
}