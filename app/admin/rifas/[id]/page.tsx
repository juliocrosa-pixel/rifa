import RaffleEditor from "@/components/admin/RaffleEditor";

export default function RafflePage({ params }: { params: { id: string } }) {
  return <RaffleEditor id={params.id} />;
}
