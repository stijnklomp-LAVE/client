import { Header } from "@/components/ui/header"

const WithNavLayout = ({
	children,
}: {
	children: React.ReactNode
}): React.JSX.Element => {
	return (
		<div
			style={{
				height: "100dvh",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}>
			<Header />
			<div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
		</div>
	)
}

export default WithNavLayout
