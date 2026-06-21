import { SignJWT } from "jose"

const getSecret = () => {
	const secret = process.env.JWT_SECRET

	if (!secret) {
		throw new Error("JWT_SECRET environment variable is not defined")
	}

	return new TextEncoder().encode(secret)
}

export async function signJwt(userId: string): Promise<string> {
	return new SignJWT({ sub: userId })
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("5m")
		.setIssuedAt()
		.sign(getSecret())
}
