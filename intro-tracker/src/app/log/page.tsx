import IntroForm from "@/components/IntroForm";

export default function LogPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Log an Introduction</h1>
      <p className="text-gray-500 mb-6">Record a new introduction you&apos;ve facilitated.</p>
      <IntroForm />
    </div>
  );
}
