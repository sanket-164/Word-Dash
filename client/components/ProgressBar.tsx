import { cn } from "@/lib/utils";

function ProgressBar({
  className,
  value,
}: {
  className?: string;
  value: number;
}) {
  return (
    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full bg-blue-500 transition-all duration-200 ease-out",
          className
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
export default ProgressBar;
