import * as PIXI from 'pixi.js'
import app from '../App'
import { map } from '../inc/utils'
import gsap from 'gsap'

class Gomme {
	constructor() {
		const texture = new PIXI.Texture.from('assets/Gomme.svg')
		this.sprite = new PIXI.Sprite(texture)
		this.sprite.anchor.set(0, 1)
		app.stage.addChildAt(this.sprite, app.stage.children.length)
		this.offSet = {
			x: 10,
			y: -10,
		}
	}
	update() {
		if (this.sprite !== undefined) {
			const mouseposition = app.renderer.plugins.interaction.mouse.global
			const deltaX = this.sprite.x - mouseposition.x
			let newAngle = map(deltaX, 0, 100, -20, 80)
			if (newAngle > 80) newAngle = 80
			this.sprite.angle = newAngle

			this.sprite.x = mouseposition.x + this.offSet.x
			this.sprite.y = mouseposition.y + this.offSet.y
		}
	}
	down() {
		const mouseposition = app.renderer.plugins.interaction.mouse.global
		gsap.to(this.offSet, {
			x: 0,
			y: 10,
			duration: 0.2,
		})
	}
	up() {
		const mouseposition = app.renderer.plugins.interaction.mouse.global
		gsap.to(this.offSet, {
			x: 10,
			y: -10,
		})
	}
}

export default Gomme
