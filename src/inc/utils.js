//méthodes Méga utiles
export function lerp(t, a, b) {
	return a * (1 - t) + t * b
}
export function normalise(t, a, b) {
	return (t - a) / (b - a)
}
export function map(t, a0, b0, a1, b1) {
	return lerp(normalise(t, a0, b0), a1, b1)
}
