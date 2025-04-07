import { Echo } from "echo-state";

interface ImageProps {
  id: string;
  contentType: string;
  base64Image: string;
  task_id?: string;
}

export const ImagesStore = new Echo<Record<string, ImageProps>>({}).indexed({
  database: "images",
  name: "images",
});
