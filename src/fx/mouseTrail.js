import * as PIXI from 'pixi.js'
import app from '../App'
import gsap from 'gsap'

class MouseTrail {
	constructor() {
		// Get the texture for rope.
		const trailTexture = PIXI.Texture.from('assets/trail.png')
		this.historyX = []
		this.historyY = []
		// historySize determines how long the trail will be.
		this.historySize = 20
		// ropeSize determines how smooth the trail will be.
		this.ropeSize = 50
		this.points = []

		// Create history array.
		for (let i = 0; i < this.historySize; i++) {
			this.historyX.push(0)
			this.historyY.push(0)
		}
		// Create rope points.
		for (let i = 0; i < this.ropeSize; i++) {
			this.points.push(new PIXI.Point(0, 0))
		}

		// Create the rope
		this.rope = new PIXI.SimpleRope(trailTexture, this.points)

		// Set the blendmode
		this.rope.blendmode = PIXI.BLEND_MODES.ADD
		app.stage.addChild(this.rope)
	}
	update() {
		this.rope.alpha = 0.1
		const mouseposition = app.renderer.plugins.interaction.mouse.global

		// Update the mouse values to history
		this.historyX.pop()
		this.historyX.unshift(mouseposition.x)
		this.historyY.pop()
		this.historyY.unshift(mouseposition.y)
		// Update the points to correspond with history.
		for (let i = 0; i < this.ropeSize; i++) {
			const p = this.points[i]
			// Smooth the curve with cubic interpolation to prevent sharp edges.
			const ix = cubicInterpolation(
				this.historyX,
				(i / this.ropeSize) * this.historySize
			)
			const iy = cubicInterpolation(
				this.historyY,
				(i / this.ropeSize) * this.historySize
			)
			p.x = ix
			p.y = iy
		}
	}
	init() {
		const mousePos = app.renderer.plugins.interaction.mouse.global
		// Create history array.
		this.historyX = []
		this.historyY = []
		for (let i = 0; i < this.historySize; i++) {
			this.historyX.push(mousePos.x)
			this.historyY.push(mousePos.y)
		}
	}
	onMouseUp() {
		const mousePos = app.renderer.plugins.interaction.mouse.global
		gsap.to(this.rope, {
			alpha: 0,
			duration: 0.5,
		})
	}
}

export default MouseTrail

/**
 * Cubic interpolation based on https://github.com/osuushi/Smooth.js
 */
function clipInput(k, arr) {
	if (k < 0) k = 0
	if (k > arr.length - 1) k = arr.length - 1
	return arr[k]
}

function getTangent(k, factor, array) {
	return (factor * (clipInput(k + 1, array) - clipInput(k - 1, array))) / 2
}

function cubicInterpolation(array, t, tangentFactor) {
	if (tangentFactor == null) tangentFactor = 1

	const k = Math.floor(t)
	const m = [
		getTangent(k, tangentFactor, array),
		getTangent(k + 1, tangentFactor, array),
	]
	const p = [clipInput(k, array), clipInput(k + 1, array)]
	t -= k
	const t2 = t * t
	const t3 = t * t2
	return (
		(2 * t3 - 3 * t2 + 1) * p[0] +
		(t3 - 2 * t2 + t) * m[0] +
		(-2 * t3 + 3 * t2) * p[1] +
		(t3 - t2) * m[1]
	)
}
