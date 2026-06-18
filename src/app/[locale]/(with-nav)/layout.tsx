import { Header } from "@/components/ui/header"

export default function WithNavLayout({
	children,
}: {
	children: React.ReactNode
}): React.JSX.Element {
	return (
		<>
			<Header />
			{children}
		</>
	)
}
