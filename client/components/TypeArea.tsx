import { cn } from "@/lib/utils";

const TypeArea = ({
  className,
  inputText,
  checkInputText,
}: {
  className?: string;
  inputText: string;
  checkInputText: (text: string) => void;
}) => {
  return (
    <textarea
      className={cn(
        `rounded-md px-3 py-2 outline-none ring transition-colors`,
        className
      )}
      placeholder="Start Typing..."
      value={inputText}
      onChange={(e) => checkInputText(e.target.value)}
    />
  );
};

export default TypeArea;
