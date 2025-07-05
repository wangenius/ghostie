import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { ImageView } from "@/page/main/ImageView";
import { ImageManager, ImagesStore } from "@/resources/Image";
import { useState } from "react";
import { TbMaximize, TbPhoto, TbTrash } from "react-icons/tb";
import { toast } from "sonner";

export function ResourcesTab() {
  const images = ImagesStore.use();
  const imagesList = Object.keys(images);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDeleteImage = async (id: string) => {
    await ImageManager.deleteImage(id);
  };

  return (
    <PreferenceLayout>
      {/* 侧边栏 - 表列表 */}
      <PreferenceList
        items={[
          {
            id: "images",
            content: (
              <div className="flex items-center gap-2 h-8">
                <TbPhoto className="h-4 w-4" />
                <span>Images</span>
              </div>
            ),
            onClick: () => {},
            actived: true,
            noRemove: true,
          },
        ]}
        left={<div className="py-2 px-3 text-xs font-medium">数据资源</div>}
        right={
          <Button size="sm" variant="ghost" className="w-full justify-start">
            导出
          </Button>
        }
      />

      {/* 主内容区 */}
      <PreferenceBody className="bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">图片资源</h3>
            <div className="text-xs text-muted-foreground">
              共 {imagesList.length} 张图片
            </div>
          </div>

          {imagesList.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {imagesList.map((imageId) => (
                <div key={imageId} className="flex flex-col gap-1">
                  <div
                    className="relative group/image aspect-square rounded-lg overflow-hidden bg-muted"
                    onClick={() => setSelectedImage(imageId)}
                  >
                    <img
                      src={images[imageId]?.base64Image}
                      alt={`图片 ${imageId}`}
                      className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                      <TbMaximize className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p
                      onClick={() => {
                        window.navigator.clipboard.writeText(imageId);
                        toast.success("图片ID已复制到剪贴板");
                      }}
                      className="text-xs truncate flex-1"
                      title={imageId}
                    >
                      {imageId.slice(0, 8)}...
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(imageId);
                      }}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <TbTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <TbPhoto className="h-10 w-10 mb-2" />
              <p className="text-sm">暂无图片</p>
            </div>
          )}
        </div>
      </PreferenceBody>

      <ImageView
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
      />
    </PreferenceLayout>
  );
}
