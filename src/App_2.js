import * as PIXI from 'pixi.js'
import { lerp, map } from './inc/utils'
import { gsap } from 'gsap'
import Datas from './Datas'
import TextSlide from './slider/TextSlide'
import Slider from './slider/Slider'
import Conf from './conf'
import Store from './Store'

import './styles.scss'
import './ui.scss'

let _w = window.innerWidth
let _h = window.innerHeight

/**
 * Variables
 */
const debug = true
const { colors } = Conf
const uiDiv = document.getElementById('UI')
/**
 * Pixi App
 */

const app = new PIXI.Application({
	antialias: true,
	resolution: window.devicePixelRatio,
	width: _w,
	height: _h,
	backgroundColor: colors.bluedark,
	autoDensity: true,
	antialias: true,
})
export default app

/*------------------------------------------------------------------------*/
const { stage, renderer } = app
const bgUrl = 'assets/background.jpg'
const bg2Url = 'assets/background_2.jpg'
const brushUrl = 'assets/brush_eraser_bruit.png'
const fontSilk = 'assets/fonts/SilkSerif-Regular.woff'

app.loader
	.add(brushUrl, { crossOrigin: 'anonymous' })
	.add(fontSilk, { crossOrigin: 'anonymous' })
	.on('progress', handleOnProgress)
	.load(setup)

/**
 * SETUP
 * @param {*} loader
 * @param {*} resources
 */
function setup(loader, resources) {
	// Create Slider
	//------------------------------------------------------------------------
	const slider = new Slider(Datas.slides)
	const slides = slider.createSlides()
	//------------------------------------------------------------------------

	const brushTexture = resources[brushUrl].texture
	const brushSprite = new PIXI.Sprite(brushTexture)
	brushSprite.scale.set(0.5)
	brushSprite.alpha = 0.4
	brushSprite.anchor.set(0.5)

	// Création d'un groupe avec le Text est son calque mask
	const textGroup = new PIXI.Container()
	stage.addChild(textGroup)

	/**
	 * TEXT
	 */
	const text = slides[Store.activeslider].text

	textGroup.addChild(text)
	textGroup.x = _w / 2 - text.width / 2
	textGroup.y = _h / 2 - text.height / 2
	/**
	 * RENDER TEXTURE
	 * De la même taille que la Box du texte
	 */
	const renderTexture = PIXI.RenderTexture.create(text.width, text.height)
	const renderTextureSprite = new PIXI.Sprite(renderTexture)
	textGroup.addChild(renderTextureSprite)

	/**
	 * MASKING
	 */
	text.mask = renderTextureSprite

	/**
	 *  On remplit de blanc le render Texture,
	 *  ce qui nous permet d'afficher entierement
	 *  les calques masqué par celui-ci
	 * */
	const blackBoard = new PIXI.Graphics()
	blackBoard.beginFill(0xffffff)
	blackBoard.drawRect(0, 0, _w, _h)
	blackBoard.endFill()
	renderer.render(blackBoard, renderTexture, false, null, false)

	/**
	 * USER LISTENERS
	 */
	app.stage.interactive = true
	app.stage.on('pointerdown', pointerDown)
	app.stage.on('pointerup', pointerUp)
	app.stage.on('pointermove', pointerMove)
	let dragging = false

	function pointerMove(event) {
		if (dragging) {
			const currentX = event.data.global.x - textGroup.x
			const currentY = event.data.global.y - textGroup.y

			for (let i = 0; i < 1; i += 0.2) {
				const lerpX = lerp(i, brushSprite.x, currentX)
				const lerpY = lerp(i, brushSprite.y, currentY)
				brushSprite.alpha = Math.random() * 0.5 + 0.2
				/**
				 * les coordonnées du brushSprite sont par rapport à la scène globale
				 * on doit les adapter à la position du layer textGroup
				 */
				brushSprite.position.copyFrom(new PIXI.Point(lerpX, lerpY))
				renderer.render(brushSprite, renderTexture, false, null, false)
			}
			brushSprite.position.copyFrom(new PIXI.Point(currentX, currentY))
			renderer.render(brushSprite, renderTexture, false, null, false)
		}
	}

	function pointerDown(event) {
		//brushSprite.position = event.data.global
		dragging = true
		pointerMove(event)
	}

	function pointerUp(event) {
		dragging = false

		// Récupération du pourcentage de pixel noirs
		const pourcent = getBlackPixelPourcent(renderTexture)

		/* DEBUG VIEW */
		if (debug) {
			const image = getImageFrom(renderTexture)
			const pourcentElem = document.createElement('span')
			pourcentElem.setAttribute('class', 'text-pourcent')
			pourcentElem.textContent = pourcent.toFixed(0) + ' %'
			uiDiv.innerHTML = ''
			// uiDiv.appendChild(image)
			uiDiv.appendChild(pourcentElem)
		}

		// dés que le texte est effacé à plus de 70% on déclenche l'action de suite
		pourcent > 65 && eraserComplete(textGroup)
	}
}

function handleOnProgress(loader, resources) {
	console.log(loader.progress + '% loaded')
}

/*-----------------------------------------------------------------------*/
function eraserComplete(textGroup) {
	// 1. Affichage du bouton dans le container UI
	// 2. Efface le reste du texte
	const btn = document.createElement('a')
	btn.setAttribute('class', 'btn align-center vertical-center')
	btn.setAttribute('id', 'EraserCompleteBtn')
	btn.setAttribute('href', '#')
	btn.innerHTML = 'Découvrir mes services'
	uiDiv.appendChild(btn)
	// GSAP  animation
	gsap.fromTo(
		btn,
		{
			opacity: 0,
			top: '65vh',
		},
		{
			opacity: 1,
			top: '50vh',
			duration: 1,
		}
	)
	const targetY = textGroup.y - 50
	// Text pixi gsap
	gsap.to(textGroup, {
		alpha: 0,
		duration: 1,
		y: targetY,
	})
	return console.log('COMPLETE ***')
}

/**
 * Get Eraser Progression as pourcents
 *
 *	> rawPixelArray ,  1 pixel = 4 item d'un array : R | V | B | A
 *	> nb Pixels = rawPixelArray / 4
 *	le rendu est en niveau de gris donc systèmatiquement R = V = B
 *	donc on peut vérifier uniquement le R pour le niveau de densité du noir
 *	je décide de qu'une valeur R < 75 nous donne un noir assez profond pour
 *  sélectionner ce pixel comme critère de notre caclu de pourcentage
 *	Je n'ai pas besoin de regarder précisément chaque pixel mais chaque 10 pixels
 * 	donc :
 *		1 : créer un tableau avec chaque 30 pixels soit chaque 40*3 value du tableau
 *		2 : compter le nombre de value < 75
 *		3 : calcul du pourcentage
 * @param {*} renderTexture
 */
function getBlackPixelPourcent(renderTexture) {
	const rawPixelArray = renderer.plugins.extract.pixels(renderTexture)
	const newArray = rawPixelArray.filter(function (value, index, ar) {
		return index % 120 == 0
	})
	// On compte tout ceux en dessous de 75
	const filter = (fn, array) =>
		array.reduce(
			(acc, currentItem) => (fn(currentItem) ? acc.concat(currentItem) : acc),
			[]
		)
	const lowerThan75 = (x) => x < 75
	const nbBlackPixel = filter(lowerThan75, newArray).length
	const pourcent = (nbBlackPixel * 100) / newArray.length

	return pourcent
}

function getImageFrom(renderTexture) {
	const image = renderer.plugins.extract.image(renderTexture)
	return image
}

/**
 * RESIZE
 */
window.addEventListener('resize', () => {
	_w = window.innerWidth
	_h = window.innerHeight
	renderer.resize(_w, _h)
})
