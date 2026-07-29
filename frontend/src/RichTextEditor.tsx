import Highlight from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { Node as TiptapNode } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Copy,
  Columns2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  GripVertical,
  MoreHorizontal,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  variant?: "default" | "longread";
  toolbarContainer?: HTMLElement | null;
  documentId?: string;
  showToolbar?: boolean;
  onFocus?: () => void;
  onUploadImage?: (file: File) => Promise<string>;
};

const TableCell = TiptapNode.create({
  name: "tableCell",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: "td" }, { tag: "th" }],
  renderHTML: () => ["td", 0],
});

const TableRow = TiptapNode.create({
  name: "tableRow",
  content: "tableCell+",
  parseHTML: () => [{ tag: "tr" }],
  renderHTML: () => ["tr", 0],
});

const EditableTable = TiptapNode.create({
  name: "editableTable",
  group: "block",
  content: "tableRow+",
  isolating: true,
  parseHTML: () => [{ tag: "table[data-longread-table]" }],
  renderHTML: () => ["table", { "data-longread-table": "true" }, ["tbody", 0]],
});

const Column = TiptapNode.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: "div[data-longread-column]" }],
  renderHTML: () => ["div", { "data-longread-column": "true" }, 0],
});

const Columns = TiptapNode.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  parseHTML: () => [{ tag: "div[data-longread-columns]" }],
  renderHTML: () => ["div", { "data-longread-columns": "true" }, 0],
});

export default function RichTextEditor({
  value,
  onChange,
  label = "Содержание урока",
  variant = "default",
  toolbarContainer = null,
  documentId,
  showToolbar = true,
  onFocus,
  onUploadImage,
}: RichTextEditorProps) {
  const [highlightColor, setHighlightColor] = useState("#fff1a8");
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [activeNodePos, setActiveNodePos] = useState<number | null>(null);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [insertError, setInsertError] = useState("");
  const blockMenuOpenRef = useRef(false);
  const [, refreshSelection] = useState(0);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const hoveredBlockRef = useRef<HTMLElement | null>(null);
  const manualDragRef = useRef<{ from: number; startX: number; startY: number; moved: boolean } | null>(null);
  const dragReferenceRef = useRef({
    getBoundingClientRect: () => hoveredBlockRef.current?.getBoundingClientRect() || new DOMRect(),
  });
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      TableCell,
      TableRow,
      EditableTable,
      Column,
      Columns,
      Highlight.configure({ multicolor: true }),
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
  blockMenuOpenRef.current = blockMenuOpen;

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const updateToolbar = () => refreshSelection((version) => version + 1);
    editor.on("selectionUpdate", updateToolbar);
    return () => {
      editor.off("selectionUpdate", updateToolbar);
    };
  }, [editor]);

  useEffect(() => {
    if (!blockMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!blockMenuRef.current?.contains(event.target as Node)) setBlockMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [blockMenuOpen]);

  useEffect(() => {
    if (!documentId || !editorRootRef.current) return;
    editorRootRef.current.querySelectorAll("h1, h2, h3").forEach((heading, index) => {
      heading.id = `${documentId}-heading-${index}`;
      heading.setAttribute("data-outline-heading", "true");
    });
  }, [documentId, editor, value]);

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;
    const rememberHoveredBlock = (event: MouseEvent) => {
      let candidate = event.target as HTMLElement | null;
      while (candidate && !candidate.parentElement?.classList.contains("rich-editor__content")) {
        candidate = candidate.parentElement;
      }
      if (candidate?.parentElement?.classList.contains("rich-editor__content")) hoveredBlockRef.current = candidate;
    };
    root.addEventListener("mousemove", rememberHoveredBlock, true);
    return () => root.removeEventListener("mousemove", rememberHoveredBlock, true);
  }, [editor]);

  const getDragReference = useCallback(() => dragReferenceRef.current, []);
  const handleDragNodeChange = useCallback(({ pos }: { pos: number }) => {
    if (!editor) return;
    if (pos >= 0) {
      const nodeDom = editor.view.nodeDOM(pos);
      if (nodeDom instanceof HTMLElement) {
        hoveredBlockRef.current = nodeDom;
        requestAnimationFrame(() => {
          const dragHandle = blockMenuRef.current?.parentElement;
          if (!dragHandle) return;
          const rect = nodeDom.getBoundingClientRect();
          dragHandle.style.position = "fixed";
          dragHandle.style.left = `${Math.max(8, rect.left - dragHandle.offsetWidth - 8)}px`;
          dragHandle.style.top = `${rect.top}px`;
          dragHandle.style.visibility = "";
        });
      }
    }
    if (!blockMenuOpenRef.current) setActiveNodePos(pos >= 0 ? pos : null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const trackDrag = (event: MouseEvent) => {
      const drag = manualDragRef.current;
      if (!drag) return;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
    };
    const finishDrag = (event: MouseEvent) => {
      const drag = manualDragRef.current;
      manualDragRef.current = null;
      document.documentElement.classList.remove("is-dragging-longread");
      if (!drag?.moved) return;
      const sourceNode = editor.state.doc.nodeAt(drag.from);
      const coordinates = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!sourceNode || !coordinates) return;
      const resolved = editor.state.doc.resolve(coordinates.pos);
      const targetFrom = resolved.depth >= 1 ? resolved.before(1) : 0;
      const targetNode = editor.state.doc.nodeAt(targetFrom);
      if (!targetNode) return;
      const targetDom = editor.view.nodeDOM(targetFrom);
      const dropAfter = targetDom instanceof HTMLElement
        ? event.clientY > targetDom.getBoundingClientRect().top + targetDom.getBoundingClientRect().height / 2
        : false;
      let insertion = targetFrom + (dropAfter ? targetNode.nodeSize : 0);
      if (insertion === drag.from || insertion === drag.from + sourceNode.nodeSize) return;
      const transaction = editor.state.tr.delete(drag.from, drag.from + sourceNode.nodeSize);
      if (insertion > drag.from) insertion -= sourceNode.nodeSize;
      transaction.insert(insertion, sourceNode);
      editor.view.dispatch(transaction);
      editor.commands.focus(insertion + 1);
    };
    document.addEventListener("mousemove", trackDrag);
    document.addEventListener("mouseup", finishDrag);
    return () => {
      document.removeEventListener("mousemove", trackDrag);
      document.removeEventListener("mouseup", finishDrag);
    };
  }, [editor]);

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

  function transformBlock(type: "paragraph" | "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote" | "code") {
    const targetPos = activeNodePos ?? currentEditor.state.selection.$from.pos;
    const chain = currentEditor.chain().focus().setTextSelection(Math.min(targetPos + 1, currentEditor.state.doc.content.size));
    if (type === "paragraph") chain.setParagraph().run();
    if (type === "h1") chain.setHeading({ level: 1 }).run();
    if (type === "h2") chain.setHeading({ level: 2 }).run();
    if (type === "h3") chain.setHeading({ level: 3 }).run();
    if (type === "bullet") chain.toggleBulletList().run();
    if (type === "ordered") chain.toggleOrderedList().run();
    if (type === "quote") chain.toggleBlockquote().run();
    if (type === "code") chain.toggleCodeBlock().run();
    setBlockMenuOpen(false);
  }

  function currentTopLevelBlock() {
    if (activeNodePos !== null) {
      const activeNode = currentEditor.state.doc.nodeAt(activeNodePos);
      if (activeNode) return { from: activeNodePos, node: activeNode };
    }
    const { $from } = currentEditor.state.selection;
    const index = $from.index(0);
    let from = 0;
    for (let current = 0; current < index; current += 1) {
      from += currentEditor.state.doc.child(current).nodeSize;
    }
    return { from, node: currentEditor.state.doc.child(index) };
  }

  function duplicateBlock() {
    const { from, node } = currentTopLevelBlock();
    currentEditor.chain().focus().insertContentAt(from + node.nodeSize, node.toJSON()).run();
    setBlockMenuOpen(false);
  }

  function deleteBlock() {
    const { from, node } = currentTopLevelBlock();
    currentEditor.chain().focus().deleteRange({ from, to: from + node.nodeSize }).run();
    setBlockMenuOpen(false);
  }

  function insertAfterCurrent(content: Parameters<typeof currentEditor.commands.insertContentAt>[1]) {
    const { from, node } = currentTopLevelBlock();
    const position = Math.min(from + node.nodeSize, currentEditor.state.doc.content.size);
    currentEditor.chain().focus().insertContentAt(position, content).run();
    setInsertMenuOpen(false);
  }

  function insertText(type: "paragraph" | "heading" | "bulletList" | "blockquote" | "codeBlock") {
    if (type === "heading") {
      insertAfterCurrent({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Новый заголовок" }] });
      return;
    }
    if (type === "bulletList") {
      insertAfterCurrent({
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Новый пункт" }] }] }],
      });
      return;
    }
    if (type === "blockquote") {
      insertAfterCurrent({
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Новая цитата" }] }],
      });
      return;
    }
    const text = type === "codeBlock" ? "// Фрагмент кода" : "";
    insertAfterCurrent({
      type,
      content: [{ type: "text", text }].filter(() => Boolean(text)),
    });
  }

  function insertColumns() {
    insertAfterCurrent({
      type: "columns",
      content: [
        { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Первая колонка" }] }] },
        { type: "column", content: [{ type: "paragraph", content: [{ type: "text", text: "Вторая колонка" }] }] },
      ],
    });
  }

  function insertTable() {
    insertAfterCurrent({
      type: "editableTable",
      content: Array.from({ length: 3 }, (_, row) => ({
        type: "tableRow",
        content: Array.from({ length: 3 }, (_, column) => ({
          type: "tableCell",
          content: [{
            type: "paragraph",
            content: row === 0 ? [{ type: "text", text: `Столбец ${column + 1}` }] : [],
          }],
        })),
      })),
    });
  }

  async function uploadAndInsertImage(file: File) {
    if (!onUploadImage) return;
    setInsertError("");
    setImageUploading(true);
    try {
      const url = await onUploadImage(file);
      insertAfterCurrent({ type: "image", attrs: { src: url, alt: file.name, title: file.name } });
    } catch (reason) {
      setInsertError(reason instanceof Error ? reason.message : "Не удалось загрузить изображение");
    } finally {
      setImageUploading(false);
    }
  }

  async function copyBlockLink() {
    if (!documentId) return;
    const targetPos = activeNodePos ?? currentEditor.state.selection.$from.pos;
    const resolved = currentEditor.state.doc.resolve(Math.min(targetPos + 1, currentEditor.state.doc.content.size));
    const currentIndex = resolved.index(0);
    let headingIndex = -1;
    for (let index = 0; index <= currentIndex; index += 1) {
      if (currentEditor.state.doc.child(index).type.name === "heading") headingIndex += 1;
    }
    const heading = currentEditor.state.doc.child(currentIndex).type.name === "heading"
      ? editorRootRef.current?.querySelectorAll<HTMLElement>("h1, h2, h3")[headingIndex]
      : null;
    const link = `${window.location.href.split("#")[0]}#${heading?.id || documentId}`;
    await navigator.clipboard.writeText(link);
    setBlockMenuOpen(false);
  }

  const blockTypeButton = (
    title: string,
    icon: React.ReactNode,
    type: "paragraph" | "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote" | "code",
    active = false,
  ) => (
    <button
      className={active ? "block-type-option block-type-option--active" : "block-type-option"}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => transformBlock(type)}
    >
      <span>{icon}</span>{title}
    </button>
  );

  const toolbar = (
      <div className={variant === "longread" ? "rich-editor__toolbar rich-editor__toolbar--longread" : "rich-editor__toolbar"} role="toolbar" aria-label="Форматирование текста">
        {variant === "longread" && <span className="editor-toolbar-title">Форматирование</span>}
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
          defaultValue="Roboto"
          onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
        >
          <option value="Roboto">Roboto</option>
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
        <span className="editor-tools-group editor-highlight-tools">
          {button(
            "Выделить текст цветом",
            () => editor.chain().focus().toggleHighlight({ color: highlightColor }).run(),
            <Highlighter />,
            editor.isActive("highlight"),
          )}
          <label className="editor-highlight-color" title="Цвет выделения">
            <span style={{ backgroundColor: highlightColor }} />
            <input
              type="color"
              value={highlightColor}
              aria-label="Цвет выделения текста"
              onChange={(event) => {
                setHighlightColor(event.target.value);
                editor.chain().focus().setHighlight({ color: event.target.value }).run();
              }}
            />
          </label>
        </span>
        {editor.isActive("image") && (
          <span className="editor-tools-group editor-image-tools">
            <button
              className="editor-image-delete"
              type="button"
              title="Удалить выбранное изображение"
              aria-label="Удалить выбранное изображение"
              aria-keyshortcuts="Delete Backspace"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            >
              <Trash2 />
              <span>Удалить</span>
            </button>
          </span>
        )}
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
  );

  return (
    <div
      className={variant === "longread" ? "rich-editor rich-editor--longread" : "rich-editor"}
      ref={editorRootRef}
      onFocusCapture={onFocus}
    >
      {showToolbar && (toolbarContainer ? createPortal(toolbar, toolbarContainer) : toolbar)}
      {variant === "longread" && (
        <DragHandle
          editor={currentEditor}
          getReferencedVirtualElement={getDragReference}
          onNodeChange={handleDragNodeChange}
        >
          <div className="rich-editor__block-menu" ref={blockMenuRef}>
            <span
              className="block-drag-grip"
              title="Перетащить элемент"
              aria-label="Перетащить элемент"
              onMouseDown={(event) => {
                if (activeNodePos === null) return;
                manualDragRef.current = {
                  from: activeNodePos,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false,
                };
                document.documentElement.classList.add("is-dragging-longread");
              }}
            >
              <GripVertical />
            </span>
            <button
              className={blockMenuOpen ? "block-menu-trigger block-menu-trigger--active" : "block-menu-trigger"}
              type="button"
              title="Изменить элемент"
              aria-label="Изменить выбранный элемент"
              aria-expanded={blockMenuOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setBlockMenuOpen((current) => !current)}
            >
              <MoreHorizontal />
            </button>
            {blockMenuOpen && (
              <div className="block-menu-popover" role="menu">
                <span className="block-menu-label">Изменить тип</span>
                {blockTypeButton("Текст", <Pilcrow />, "paragraph", editor.isActive("paragraph"))}
                {blockTypeButton("Заголовок 1", <Heading1 />, "h1", editor.isActive("heading", { level: 1 }))}
                {blockTypeButton("Заголовок 2", <Heading2 />, "h2", editor.isActive("heading", { level: 2 }))}
                {blockTypeButton("Заголовок 3", <Heading3 />, "h3", editor.isActive("heading", { level: 3 }))}
                <span className="block-menu-divider" />
                {blockTypeButton("Маркированный список", <List />, "bullet", editor.isActive("bulletList"))}
                {blockTypeButton("Нумерованный список", <ListOrdered />, "ordered", editor.isActive("orderedList"))}
                {blockTypeButton("Цитата", <Quote />, "quote", editor.isActive("blockquote"))}
                {blockTypeButton("Фрагмент кода", <Braces />, "code", editor.isActive("codeBlock"))}
                <span className="block-menu-divider" />
                <button className="block-type-option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void copyBlockLink()} disabled={!documentId}><span><Link2 /></span>Скопировать ссылку</button>
                <button className="block-type-option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={duplicateBlock}><span><Copy /></span>Дублировать</button>
                <button className="block-type-option block-type-option--danger" type="button" onMouseDown={(event) => event.preventDefault()} onClick={deleteBlock}><span><Trash2 /></span>Удалить</button>
              </div>
            )}
          </div>
        </DragHandle>
      )}
      <EditorContent editor={editor} />
      {variant === "longread" && showToolbar && (
        <div className="longread-insert-shell">
          {insertMenuOpen && (
            <div className="longread-insert-menu" role="menu">
              <span>Добавить в лонгрид</span>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertText("heading")}><Heading2 /> Заголовок</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertText("bulletList")}><List /> Список</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertText("blockquote")}><Quote /> Цитата</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertText("codeBlock")}><Braces /> Код</button>
            </div>
          )}
          <div className="longread-insert-bar" role="toolbar" aria-label="Добавить элемент">
            <button
              className={insertMenuOpen ? "longread-insert-plus longread-insert-plus--active" : "longread-insert-plus"}
              type="button"
              title="Все элементы"
              aria-label="Все элементы"
              aria-expanded={insertMenuOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setInsertMenuOpen((current) => !current)}
            >
              <Plus />
            </button>
            <button type="button" title="Добавить текст" aria-label="Добавить текст" onMouseDown={(event) => event.preventDefault()} onClick={() => insertText("paragraph")}><span>Aa</span></button>
            <label className={imageUploading ? "longread-insert-file longread-insert-file--busy" : "longread-insert-file"} title="Добавить изображение">
              <ImagePlus />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={imageUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAndInsertImage(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button type="button" title="Добавить две колонки" aria-label="Добавить две колонки" onMouseDown={(event) => event.preventDefault()} onClick={insertColumns}><Columns2 /></button>
            <button type="button" title="Добавить таблицу" aria-label="Добавить таблицу" onMouseDown={(event) => event.preventDefault()} onClick={insertTable}><Table2 /></button>
          </div>
          {insertError && <p className="longread-insert-error">{insertError}</p>}
        </div>
      )}
    </div>
  );
}
