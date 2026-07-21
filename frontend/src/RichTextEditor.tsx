import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  variant?: "default" | "longread";
};

export default function RichTextEditor({ value, onChange, label = "Содержание урока", variant = "default" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class: "rich-editor__content",
        "aria-label": label,
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return <div className="rich-editor rich-editor--loading">Загружаем редактор…</div>;
  const currentEditor = editor;

  const button = (
    title: string,
    action: () => void,
    icon: React.ReactNode,
    active = false,
  ) => (
    <button
      className={active ? "editor-tool editor-tool--active" : "editor-tool"}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={action}
    >
      {icon}
    </button>
  );

  function setLink() {
    const previousUrl = currentEditor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Введите адрес ссылки", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      currentEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }

  return (
    <div className={variant === "longread" ? "rich-editor rich-editor--longread" : "rich-editor"}>
      <div className="rich-editor__toolbar" role="toolbar" aria-label="Форматирование текста">
        <select
          className="editor-select editor-select--format"
          aria-label="Стиль абзаца"
          value={
            editor.isActive("heading", { level: 1 }) ? "h1"
              : editor.isActive("heading", { level: 2 }) ? "h2"
                : editor.isActive("heading", { level: 3 }) ? "h3" : "p"
          }
          onChange={(event) => {
            const format = event.target.value;
            if (format === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(format.slice(1)) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">Обычный текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
          <option value="h3">Заголовок 3</option>
        </select>
        <select
          className="editor-select"
          aria-label="Шрифт"
          defaultValue="Inter"
          onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
        >
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select
          className="editor-select editor-select--size"
          aria-label="Размер шрифта"
          defaultValue="16px"
          onChange={(event) => editor.chain().focus().setFontSize(event.target.value).run()}
        >
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <span className="editor-tools-group">
          {button("Полужирный", () => editor.chain().focus().toggleBold().run(), <Bold />, editor.isActive("bold"))}
          {button("Курсив", () => editor.chain().focus().toggleItalic().run(), <Italic />, editor.isActive("italic"))}
          {button("Зачёркнутый", () => editor.chain().focus().toggleStrike().run(), <Strikethrough />, editor.isActive("strike"))}
        </span>
        <span className="editor-tools-group">
          {button("Маркированный список", () => editor.chain().focus().toggleBulletList().run(), <List />, editor.isActive("bulletList"))}
          {button("Нумерованный список", () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered />, editor.isActive("orderedList"))}
          {button("Цитата", () => editor.chain().focus().toggleBlockquote().run(), <Quote />, editor.isActive("blockquote"))}
          {button("Ссылка", setLink, <Link2 />, editor.isActive("link"))}
        </span>
        <span className="editor-tools-group">
          {button("По левому краю", () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft />, editor.isActive({ textAlign: "left" }))}
          {button("По центру", () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter />, editor.isActive({ textAlign: "center" }))}
          {button("По правому краю", () => editor.chain().focus().setTextAlign("right").run(), <AlignRight />, editor.isActive({ textAlign: "right" }))}
        </span>
        <label className="editor-color" title="Цвет текста">
          <span>A</span>
          <input type="color" defaultValue="#182016" aria-label="Цвет текста" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
        </label>
        <select
          className="editor-select editor-select--line"
          aria-label="Межстрочный интервал"
          defaultValue="1.5"
          onChange={(event) => editor.chain().focus().setLineHeight(event.target.value).run()}
        >
          <option value="1.2">Интервал 1,2</option>
          <option value="1.5">Интервал 1,5</option>
          <option value="1.75">Интервал 1,75</option>
          <option value="2">Интервал 2</option>
        </select>
        <span className="editor-tools-group editor-tools-group--end">
          {button("Отменить", () => editor.chain().focus().undo().run(), <Undo2 />)}
          {button("Повторить", () => editor.chain().focus().redo().run(), <Redo2 />)}
          {button("Очистить форматирование", () => editor.chain().focus().unsetAllMarks().clearNodes().run(), <Eraser />)}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
