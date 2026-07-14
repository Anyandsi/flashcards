import {
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type UIEvent,
} from 'react';

type DroppedImage = {
  alt: string;
  src: string;
};

type MarkdownEditorProps = {
  onImageDrop?: (file: File) => Promise<DroppedImage>;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const imageExtensionPattern = /\.(gif|jpe?g|png|webp)$/i;

function renderHighlightedMarkdown(value: string) {
  const nodes: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < value.length) {
    if (value.startsWith('$$', index)) {
      const closingIndex = value.indexOf('$$', index + 2);

      nodes.push(
        <span className="text-success" key={key}>
          $$
        </span>,
      );
      key += 1;

      if (closingIndex === -1) {
        nodes.push(
          <span className="text-primary" key={key}>
            {value.slice(index + 2)}
          </span>,
        );
        break;
      }

      nodes.push(
        <span className="text-primary" key={key}>
          {value.slice(index + 2, closingIndex)}
        </span>,
      );
      key += 1;
      nodes.push(
        <span className="text-success" key={key}>
          $$
        </span>,
      );
      key += 1;
      index = closingIndex + 2;
      continue;
    }

    if (value[index] === '$') {
      const closingIndex = value.indexOf('$', index + 1);

      nodes.push(
        <span className="text-success" key={key}>
          $
        </span>,
      );
      key += 1;

      if (closingIndex === -1) {
        index += 1;
        continue;
      }

      nodes.push(
        <span className="text-primary" key={key}>
          {value.slice(index + 1, closingIndex)}
        </span>,
      );
      key += 1;
      nodes.push(
        <span className="text-success" key={key}>
          $
        </span>,
      );
      key += 1;
      index = closingIndex + 1;
      continue;
    }

    const nextDollarIndex = value.indexOf('$', index);
    const nextIndex = nextDollarIndex === -1 ? value.length : nextDollarIndex;

    nodes.push(value.slice(index, nextIndex));
    index = nextIndex;
  }

  return nodes;
}

function hasImageItems(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.items).some(
    (item) =>
      item.kind === 'file' &&
      (item.type.startsWith('image/') ||
        (item.getAsFile() ? imageExtensionPattern.test(item.getAsFile()?.name ?? '') : false)),
  );
}

function getImageFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.files).filter(
    (file) => file.type.startsWith('image/') || imageExtensionPattern.test(file.name),
  );
}

function escapeMarkdownImageAlt(value: string) {
  return value.replace(/[[\]\\]/g, '\\$&');
}

export function MarkdownEditor({
  onChange,
  onImageDrop,
  placeholder,
  value,
}: MarkdownEditorProps) {
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!highlightRef.current) {
      return;
    }

    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function insertMarkdown(text: string) {
    const textarea = textareaRef.current;
    const hasFocus = document.activeElement === textarea;
    const start = hasFocus && textarea ? textarea.selectionStart : value.length;
    const end = hasFocus && textarea ? textarea.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith('\n') ? '\n\n' : '';
    const suffix = after && !after.startsWith('\n') ? '\n\n' : '';
    const nextValue = `${before}${prefix}${text}${suffix}${after}`;
    const nextCursorPosition = before.length + prefix.length + text.length;

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!onImageDrop || !hasImageItems(event)) {
      return;
    }

    event.preventDefault();
    setIsDraggingImage(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!onImageDrop || !hasImageItems(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingImage(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDraggingImage(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!onImageDrop) {
      return;
    }

    const imageFiles = getImageFiles(event);

    if (!imageFiles.length) {
      return;
    }

    event.preventDefault();
    setIsDraggingImage(false);
    setDropError(null);

    try {
      const droppedImages = await Promise.all(imageFiles.map((file) => onImageDrop(file)));
      const markdownImages = droppedImages
        .map((image) => `![${escapeMarkdownImageAlt(image.alt)}](${image.src})`)
        .join('\n\n');

      insertMarkdown(markdownImages);
    } catch (error) {
      setDropError(error instanceof Error ? error.message : 'Failed to add image');
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-2">
      <div
        className={`relative min-h-0 flex-1 overflow-hidden rounded-md border bg-background focus-within:border-primary ${
          isDraggingImage ? 'border-primary ring-1 ring-primary' : 'border-border'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <pre
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3 font-mono text-sm font-normal leading-6 text-foreground"
          ref={highlightRef}
        >
          {value ? renderHighlightedMarkdown(value) : null}
        </pre>
        <textarea
          className="relative h-full w-full resize-none overflow-auto rounded-md bg-transparent p-3 font-mono text-sm font-normal leading-6 text-transparent caret-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onScroll={handleScroll}
          placeholder={placeholder}
          ref={textareaRef}
          spellCheck={false}
          value={value}
        />
      </div>
      {dropError ? <p className="text-sm text-destructive">{dropError}</p> : null}
    </div>
  );
}
