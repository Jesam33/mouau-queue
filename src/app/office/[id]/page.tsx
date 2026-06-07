import { OfficeDetail } from "@/components/office-detail"

export const dynamic = "force-dynamic"

export default function OfficeDetailPage({ params }: { params: { id: string } }) {
  return <OfficeDetail officeId={params.id} />
}
