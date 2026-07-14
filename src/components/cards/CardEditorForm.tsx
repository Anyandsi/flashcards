import { Save } from 'lucide-react';
import { useState } from 'react';
import type { CardContents } from '../../models/decks';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';

type CardEditorValues = {
  contents: CardContents;
  title: string;
};

type CardEditorFormProps = {
  initialContents?: CardContents;
  initialTitle?: string;
  isSaving: boolean;
  onSubmit: (values: CardEditorValues) => void;
  submitLabel: string;
};

function getInitialMarkdown(contents: CardContents | undefined) {
  return contents?.markdown ?? '';
}

function getImageAlt(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'image';
}

export function CardEditorForm({
  initialContents,
  initialTitle = '',
  isSaving,
  onSubmit,
  submitLabel,
}: CardEditorFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [markdown, setMarkdown] = useState(getInitialMarkdown(initialContents));
  const titleValue = title.trim();
  const canSave = !!titleValue && !!markdown.trim();

  function handleSubmit() {
    if (!canSave || isSaving) {
      return;
    }

    onSubmit({
      contents: {
        markdown,
        type: 'markdown',
      },
      title: titleValue,
    });
  }

  async function handleImageDrop(file: File) {
    const savedImage = await window.api.attachments.saveImage({
      data: await file.arrayBuffer(),
      name: file.name,
      type: file.type,
    });

    return {
      alt: getImageAlt(savedImage.name),
      src: savedImage.src,
    };
  }

  return (
    <div className="rounded-md border border-border bg-card p-5 text-card-foreground">
      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Title
          <input
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Card title"
            type="text"
            value={title}
          />
        </label>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <label className="flex h-96 min-h-0 flex-col gap-2 text-sm font-medium">
            <span className="sr-only">Card markdown</span>
            <MarkdownEditor
              onImageDrop={handleImageDrop}
              onChange={setMarkdown}
              placeholder="Use markdown, $inline math$, and $$block math$$"
              value={markdown}
            />
          </label>

          <div className="flex h-96 min-h-0 flex-col rounded-md border border-border bg-background p-4">
            <p className="mb-3 shrink-0 text-sm font-medium text-muted-foreground">Preview</p>
            <div className="min-h-0 flex-1 overflow-auto">
              <MarkdownPreview markdown={markdown} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSave || isSaving}
            onClick={handleSubmit}
            type="button"
          >
            <Save size={16} aria-hidden="true" />
            {isSaving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
