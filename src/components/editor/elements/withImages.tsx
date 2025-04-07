import { Editor, Transforms } from "slate";
import { ImageElement } from "./image";

export const withImages = (editor: Editor) => {
  const { isInline, isVoid, markableVoid } = editor;

  editor.isInline = (element) => {
    return element.type === "image" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === "image" ? true : isVoid(element);
  };

  editor.markableVoid = (element) => {
    return element.type === "image" || markableVoid(element);
  };

  return editor;
};

export const insertImage = (
  editor: Editor,
  imageData: { contentType: string; base64Image: string },
) => {
  const image: ImageElement = {
    type: "image",
    contentType: imageData.contentType,
    base64Image: imageData.base64Image,
    url: `data:${imageData.contentType};base64,${imageData.base64Image}`,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, image);
  Transforms.move(editor);
};
