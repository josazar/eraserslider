import * as PIXI from 'pixi.js'
import Conf from '../conf'
import Store from '../Store'
import { lerp, map } from '../inc/utils'
import { gsap } from 'gsap'
import app from '../App'
import { filters } from 'pixi.js'

class TextSlide {
	constructor(slideData, brushSprite) {
		this.datas = slideData
		this.id = slideData.id
		this.erasedWordsObj = []
		this.brushSprite = brushSprite
		this.pixiTextsArray = []
		this.wordsInRowsArray = [[]]
		this.slideContainer = new PIXI.Container()
		this.isMultiText = slideData.isMultiText
		this.isComplete = false

		// UI DOM ELEMENTS
		const uiDiv = document.getElementById('UI')
		// CTA Bouton
		this.btn = document.createElement('a')
		this.btn.setAttribute('class', 'btn cta-slider ')
		this.btn.setAttribute('id', 'EraserCompleteBtn')
		this.btn.setAttribute('href', slideData.ctaUrl)
		this.btn.style.display = 'none'
		this.btn.innerHTML = `Je découvre l'offre`
		uiDiv.appendChild(this.btn)
		// InfoBulle
		if (slideData.infoBulle !== undefined) {
			this.infoBulle = document.createElement('p')
			this.infoBulle.setAttribute('class', 'slider-info-bulle')
			this.infoBulle.setAttribute('href', '#')
			this.infoBulle.innerHTML = slideData.infoBulle
			uiDiv.appendChild(this.infoBulle)
		}
		// confs

		const { colors, textSlider } = Conf
		const { stage, renderer } = app

		const textSize = textSlider.textSize
		const style = {
			fill: colors.beige,
			fontSize: textSize,
			align: 'center',
			fontFamily: 'SilkSerif-Regular',
		}
		const { section } = slideData
		const bgColor = section === 'formation' ? colors.bluedark : colors.bordeau
		const _w = window.innerWidth
		const _h = window.innerHeight

		// bg
		const bg = (this.bg = new PIXI.Graphics())
		bg.beginFill(bgColor)
		bg.drawRect(0, 0, window.innerWidth, window.innerHeight)
		bg.endFill()
		bg.x = 0
		bg.y = 0

		// Slide Container
		this.slideContainer.addChild(bg)
		this.slideContainer.x = 0
		this.slideContainer.y = 0
		// Création d'un container qui va accuillir le ou les calques Text et le ou les masks
		this.textGroup = new PIXI.Container()
		// 2 modes
		let textContent = slideData.text

		// S'il y a plusieurs groupes de mots à effacer
		// on créé des 'briques' de textes, soit brut (non effaclbe) soir effacable (createErasedContent)
		if (this.isMultiText) {
			let erasedTextNumber = 0
			textContent.forEach((item, index) => {
				let pixiText
				if (item.replace === undefined) {
					// alors le texte est brut (n'est pas effacable)
					pixiText = this.createTextBrut(item.content, style)
					// on place toutes les 'briques' de textes dans le tableau pixiTextsArray
					this.textGroup.addChild(pixiText)
					// tableau des blocs mots qui va nous servir à les positionner
					this.pixiTextsArray.push(pixiText)
				} else {
					const erasedContent = new ErasedContent({
						textContent: item.content,
						textReplace: item.replace,
						root: this,
						slideData,
					})
					erasedTextNumber++
					this.erasedWordsObj.push(erasedContent)

					// on place toutes les 'briques' de textes dans le tableau pixiTextsArray
					this.textGroup.addChild(erasedContent.group)
					// tableau des blocs mots qui va nous servir à les positionner
					this.pixiTextsArray.push(erasedContent.group)
				}
			})
			// Positionnement des 'Briques'
			this.rearangeTextBlock()
		} else {
			// Un seul groupe / La phrase complète est à effacer !
			this.fullText = new ErasedContent({
				textContent,
				root: this,
				slideData,
			})
			this.erasedWordsObj.push(this.fullText)
			this.textGroup.addChild(this.fullText.group)
		}

		this.textGroup.x = _w / 2 - this.textGroup.width / 2
		this.textGroup.y = _h / 2 - this.textGroup.height / 2

		this.slideContainer.addChild(this.textGroup)
		stage.addChild(this.slideContainer)

		// Resize Window Listener
		window.addEventListener('resize', () => {
			if (this.isMultiText) {
				this.rearangeTextBlock()
			} else {
				this.reSizeFullText(slideData)
			}
		})
	}

	reSizeFullText(slideData) {
		// Je pense qu'il faut réinitialiser  le erasedContent pour que la texture soit bien aligné au texte
		const textContent = slideData.text
		this.fullText = new ErasedContent({
			textContent,
			root: this,
			slideData,
		})
		this.erasedWordsObj = []
		this.erasedWordsObj.push(this.fullText)
		this.textGroup.removeChildren()
		this.textGroup.addChild(this.fullText.group)
	}

	rearangeTextBlock() {
		// j'ai mon tableau de pixiText maintenant on va les positionner pour former un paragarphe centré
		let max_width = 1000
		const space_width = 15
		let current_line_width = 0
		let next_line_width = 0
		const _w = window.innerWidth
		const _h = window.innerHeight

		if (_w < max_width + 200) max_width = _w - 400
		let row = 0
		let row_height = 50
		// on doit calculer le maw width de textGroup avant de pouvoir poisiotnner les block texte
		let maxRowWidth = 0

		this.wordsInRowsArray = [[]]
		// on veut un nouvel array à deux dimensions avec chaque ligne sur un niveau
		this.pixiTextsArray.forEach((item, index) => {
			if (this.wordsInRowsArray[row] === undefined) {
				this.wordsInRowsArray[row] = []
			}
			this.wordsInRowsArray[row].push(item)
			item.y = row * row_height
			current_line_width += item.width + space_width
			if (index < this.pixiTextsArray.length - 1) {
				next_line_width +=
					item.width + space_width + this.pixiTextsArray[index + 1].width
			}
			if (current_line_width > maxRowWidth) maxRowWidth = current_line_width
			if (next_line_width > max_width) {
				next_line_width = 0
				current_line_width = 0
				row += 1 // on passe à la ligne
			}
		})

		//	 maintenant qu'on a notre tableau à 2 demension avec les blocs de mots trié par ligne/row, on peut centrer le paragarphe en calculant la pos x de chaque bloque de mots
		this.wordsInRowsArray.forEach((row, index) => {
			let row_width = 0
			for (let i = 0; i < row.length; i++) {
				row_width += row[i].width
			}
			// calcul de la position x de chaque bloque sur la ligne
			for (let j = 0; j < row.length; j++) {
				// on positionne le premier et les suivants seront positionné en fonction du premier
				if (j === 0) {
					row[j].x = maxRowWidth / 2 - row_width / 2
				} else {
					row[j].x = row[j - 1].x + row[j - 1].width + space_width
				}
			}
		})
		this.textGroup.x = _w / 2 - this.textGroup.width / 2
		this.textGroup.y = _h / 2 - this.textGroup.height / 2
	}

	createTextBrut(textContent, style) {
		const pixiText = new PIXI.Text(textContent)
		pixiText.style = style
		return pixiText
	}
}

/**
 * Créé un groupe constitué du Texte et de son calque Mask qui est utilisé pour le calcul
 * de l'effet Gomme
 * retourne le groupe avec les deux Sprites
 */
class ErasedContent {
	constructor(...args) {
		const [{ textContent, textReplace, root, slideData }] = args
		this.pixiText = new PIXI.Text(textContent)
		this.root = root
		this.textReplace = textReplace
		this.rootSlideId = root.id
		this.isErased = false
		// Fx
		this.blurFilter = new filters.BlurFilter()
		this.blurFilter.blur = 0
		this.pixiText.filters = [this.blurFilter]

		const marge = 200
		const { colors, textSlider } = Conf
		const { section } = slideData
		const secondColor =
			section === 'formation' ? colors.blue_1 : colors.bordeau_clair
		const textSize = textSlider.textSize
		let color = colors.beige
		// s'il y a un texte de remplacement on peut se dire que la couleur du texte est différent du texte 'brut'
		if (textReplace) {
			color = secondColor
		}

		const style = {
			fill: color,
			fontSize: textSize,
			align: 'center',
			fontFamily: 'SilkSerif-Regular',
		}
		this.pixiText.style = style
		const _w = window.innerWidth
		// Si le bout de texte à effacer est le texte entier, on définit la largeur suivant la largeur de la fenêtre
		if (!root.isMultiText) {
			let widthContainer = window.innerWidth - marge * 2
			if (_w > 1100) {
				widthContainer = 900
			}
			this.pixiText.style.wordWrapWidth = widthContainer
			this.pixiText.style.wordWrap = true
		}

		// RENDER TEXTURE - De la même taille que la Box du texte
		this.rdTexture = PIXI.RenderTexture.create(
			this.pixiText.width,
			this.pixiText.height
		)
		this.renderTextureSprite = new PIXI.Sprite(this.rdTexture)
		// Masking
		this.pixiText.mask = this.renderTextureSprite
		//  On remplit de blanc le render Texture, ce qui nous permet d'afficher entierement
		//  les calques masqué par celui-ci
		const blackBoard = new PIXI.Graphics()
		blackBoard.beginFill(0xffffff)
		blackBoard.drawRect(0, 0, this.pixiText.width, this.pixiText.height)
		blackBoard.endFill()
		app.renderer.render(blackBoard, this.rdTexture, false, null, false)
		this.group = new PIXI.Container()
		this.group.addChild(this.pixiText)
		this.group.addChild(this.renderTextureSprite)
		this.renderTextureSprite.interactive = true
		// renderTextureSprite.moveWhenInside = true
		this.renderTextureSprite.on('pointermove', (event) =>
			this.onMouseMove(event)
		)
	}

	onMouseMove(event) {
		if (
			Store.activeSlider === this.rootSlideId &&
			Store.dragging &&
			!this.isErased
		) {
			// l'event mousemove se déclenche même sur les sprites des autres slides qui sont endessous, donc je vérifie que les sprites de la slide courante.
			const diffX = this.root.textGroup.x + this.group.x
			const diffY = this.root.textGroup.y + this.group.y
			const currentRenderTexture = this.rdTexture
			const currentX = event.data.global.x - diffX
			const currentY = event.data.global.y - diffY
			const brushSprite = this.root.brushSprite
			for (let i = 0; i < 1; i += 0.25) {
				const lerpX = lerp(i, brushSprite.x, currentX)
				const lerpY = lerp(i, brushSprite.y, currentY)
				brushSprite.alpha = Math.random() * 0.5 + 0.2
				// les coordonnées du brushSprite sont par rapport à la scène globale
				// on doit les adapter à la position du layer textGroup
				brushSprite.position.copyFrom(new PIXI.Point(lerpX, lerpY))
				app.renderer.render(
					brushSprite,
					currentRenderTexture,
					false,
					null,
					false
				)
			}
			brushSprite.position.copyFrom(new PIXI.Point(currentX, currentY))
			app.renderer.render(brushSprite, currentRenderTexture, false, null, false)
		}
	}
	onErasedComplete() {
		if (!this.isErased) {
			// S'il y a une autre version de texte on la met à la place
			if (this.textReplace) {
				const { colors } = Conf
				this.pixiText.text = this.textReplace
				this.pixiText.style.fill = colors.beige
				//this.pixiText.position =
				this.renderTextureSprite.width = this.pixiText.width
				this.renderTextureSprite.height = this.pixiText.height
				//  On remplit de blanc le render Texture, ce qui nous permet d'afficher entierement
				//  les calques masqué par celui-ci
				const blackBoard = new PIXI.Graphics()
				blackBoard.beginFill(0xffffff)
				blackBoard.drawRect(
					0,
					0,
					window.innerWidth,
					this.renderTextureSprite.height
				)
				blackBoard.endFill()
				app.renderer.render(blackBoard, this.rdTexture, false, null, false)
				// animate
				// init blur effect
				gsap.fromTo(
					this.blurFilter,
					{
						blur: 5,
					},
					{
						blur: 0,
						duration: 1,
					}
				)
			}
			this.isErased = true
		}
	}
}

export default TextSlide
