export function PreferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex overflow-hidden gap-2 w-full">
      {children}
    </div>
  );
}
