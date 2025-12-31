import TopBar from "@/components/TopBar";
import TypeArea from "@/components/TypeArea";

export default function Home() {
  return (
    <div>
      <TopBar />
      <div className="container mx-auto p-4">
        <TypeArea />
      </div>
    </div>
  );
}
