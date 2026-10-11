import Link from "next/link";

export default function Problem({ message }: { message: string }) {
  return (
    <div className="border-2 border-red-700 bg-white p-6" role="alert">
      <p>{message}</p>
      <Link href="/admin" className="mt-3 inline-block font-semibold underline">
        Back to events
      </Link>
    </div>
  );
}
