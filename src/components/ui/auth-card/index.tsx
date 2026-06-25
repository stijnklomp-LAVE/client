import { Card } from "@mantine/core"

type AuthCardProps = {
	children: React.ReactNode
	maxWidth?: number
}

export const AuthCard = ({
	children,
	maxWidth = 420,
}: AuthCardProps): React.JSX.Element => (
	<Card
		withBorder
		shadow="sm"
		padding="xl"
		radius="md"
		maw={maxWidth}
		w="100%">
		{children}
	</Card>
)

AuthCard.displayName = "AuthCard"
