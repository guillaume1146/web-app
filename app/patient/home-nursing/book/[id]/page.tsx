import { redirect } from "next/navigation"

interface Props {
 params: Promise<{ id: string }>
}

export default async function NurseBookingByIdPage({ params }: Props) {
 const { id } = await params
 redirect(`/patient/book/nurse/${id}`)
}
