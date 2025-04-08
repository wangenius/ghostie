import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageManager } from "@/resources/Image";
import { useEffect, useState } from "react";

export const ImageView = ({
  selectedImage,
  setSelectedImage,
}: {
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
}) => {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    if (selectedImage) {
      ImageManager.getImageBody(selectedImage).then((image) => {
        setImage(image);
      });
    }
  }, [selectedImage]);
  return (
    <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="max-w-[80vw] max-h-[80vh] p-0 bg-black/90 border-none">
        {image && (
          <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden">
            <img
              src={`${image}`}
              alt="用户上传的图片"
              className="max-w-full max-h-[98vh] object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
